"""
MEDIPREDICT AI — FastAPI Scikit-learn Inference & Evaluation Service
Run locally with:
  uvicorn app:app --app-dir python_backend --host 0.0.0.0 --port 8001
Keep each disease dataset, preprocessing pipeline, and trained model strictly separate.

Rate-limiting note:
  Prediction endpoints use a lightweight, process-local in-memory sliding-window
  rate limiter. In multi-worker (`--workers > 1`) or horizontally scaled deployments,
  each worker tracks its own window; add a reverse-proxy or shared Redis limiter at
  the ingress layer for global enforcement across instances.
"""

from __future__ import annotations

from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import logging
import math
import os
from pathlib import Path
import threading
import time
from typing import Annotated, Any, Deque, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field
from starlette.types import ASGIApp, Message, Receive, Scope, Send

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "saved_models"

DEFAULT_MAX_BODY_BYTES = 16 * 1024  # 16 KiB limit for clinical feature payloads
DEFAULT_RATE_LIMIT_MAX_REQUESTS = 60
DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60

logger = logging.getLogger("medipredict.api")
if not logger.handlers:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def _env_positive_int(name: str, default: int, minimum: int = 1) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        parsed = int(raw.strip())
        return max(minimum, parsed)
    except ValueError:
        logger.warning("Invalid integer for %s; falling back to %d", name, default)
        return default


class SlidingWindowRateLimiter:
    """
    Thread-safe, process-local sliding-window rate limiter keyed by client IP.
    Limitation: in-memory state is not shared across multiple uvicorn workers or
    container replicas; multi-instance deployments require an external gateway/Redis limiter.
    """

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max(1, max_requests)
        self.window_seconds = max(1, window_seconds)
        self._buckets: Dict[str, Deque[float]] = {}
        self._lock = threading.Lock()

    def reset(self, max_requests: int | None = None, window_seconds: int | None = None) -> None:
        with self._lock:
            self._buckets.clear()
            if max_requests is not None:
                self.max_requests = max(1, max_requests)
            if window_seconds is not None:
                self.window_seconds = max(1, window_seconds)

    def check(self, client_key: str) -> Tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            bucket = self._buckets.get(client_key)
            if bucket is None:
                bucket = deque()
                self._buckets[client_key] = bucket

            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= self.max_requests:
                oldest = bucket[0]
                retry_after = max(1, math.ceil(self.window_seconds - (now - oldest)))
                return False, retry_after

            bucket.append(now)

            # Opportunistically prune stale empty buckets to keep memory bounded
            if len(self._buckets) > 2048:
                stale_keys = [
                    key for key, q in self._buckets.items() if not q or q[-1] <= cutoff
                ]
                for key in stale_keys:
                    self._buckets.pop(key, None)

            return True, 0


class RequestSizeLimitMiddleware:
    """
    Pure ASGI middleware enforcing strict maximum request payload byte size
    (checks both Content-Length header and streamed body chunks).
    """

    def __init__(self, app: ASGIApp, max_body_bytes: int = DEFAULT_MAX_BODY_BYTES) -> None:
        self.app = app
        self.max_body_bytes = max(1024, max_body_bytes)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET").upper()
        if method not in {"POST", "PUT", "PATCH"}:
            await self.app(scope, receive, send)
            return

        headers = {k.lower(): v for k, v in scope.get("headers", [])}
        content_length_raw = headers.get(b"content-length")
        if content_length_raw is not None:
            try:
                content_length = int(content_length_raw.decode("ascii"))
            except (UnicodeDecodeError, ValueError):
                response = JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header."},
                )
                await response(scope, receive, send)
                return

            if content_length < 0:
                response = JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid negative Content-Length header."},
                )
                await response(scope, receive, send)
                return

            if content_length > self.max_body_bytes:
                response = JSONResponse(
                    status_code=413,
                    content={
                        "detail": (
                            f"Request payload exceeds maximum allowed size "
                            f"({self.max_body_bytes} bytes)."
                        )
                    },
                )
                await response(scope, receive, send)
                return

        chunks: List[bytes] = []
        total_bytes = 0
        more_body = True
        disconnect_received = False

        while more_body:
            message = await receive()
            msg_type = message.get("type")
            if msg_type == "http.disconnect":
                disconnect_received = True
                break
            if msg_type != "http.request":
                continue

            chunk = message.get("body", b"")
            total_bytes += len(chunk)
            if total_bytes > self.max_body_bytes:
                response = JSONResponse(
                    status_code=413,
                    content={
                        "detail": (
                            f"Request payload exceeds maximum allowed size "
                            f"({self.max_body_bytes} bytes)."
                        )
                    },
                )
                await response(scope, receive, send)
                return

            if chunk:
                chunks.append(chunk)
            more_body = bool(message.get("more_body", False))

        buffered_body = b"".join(chunks)
        body_sent = False

        async def replay_receive() -> Message:
            nonlocal body_sent
            if not body_sent:
                body_sent = True
                return {"type": "http.request", "body": buffered_body, "more_body": False}
            if disconnect_received:
                return {"type": "http.disconnect"}
            return await receive()

        await self.app(scope, replay_receive, send)


class FeatureSpec(BaseModel):
    label: str
    unit: str | None = None
    min_val: float
    max_val: float


DISEASE_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "heart": {
        "artifact_stem": "heart",
        "positive_label": "Higher Risk Indicator (1 — Model Prediction)",
        "negative_label": "Lower Risk Indicator (0 — Model Prediction)",
        "features": {
            "age": FeatureSpec(label="Age", unit="years", min_val=18, max_val=110),
            "sex": FeatureSpec(label="Sex", min_val=0, max_val=1),
            "cp": FeatureSpec(label="Chest Pain", min_val=0, max_val=3),
            "trestbps": FeatureSpec(label="Rest BP", unit="mm Hg", min_val=60, max_val=250),
            "chol": FeatureSpec(label="Cholesterol", unit="mg/dL", min_val=80, max_val=650),
            "fbs": FeatureSpec(label="Fasting BS", min_val=0, max_val=1),
            "restecg": FeatureSpec(label="Rest ECG", min_val=0, max_val=2),
            "thalach": FeatureSpec(label="Max HR", unit="bpm", min_val=50, max_val=240),
            "exang": FeatureSpec(label="Ex. Angina", min_val=0, max_val=1),
            "oldpeak": FeatureSpec(label="Oldpeak", unit="mm", min_val=0, max_val=10),
            "slope": FeatureSpec(label="ST Slope", min_val=0, max_val=2),
            "ca": FeatureSpec(label="Vessels (ca)", min_val=0, max_val=4),
            "thal": FeatureSpec(label="Thal", min_val=0, max_val=3),
        },
    },
    "diabetes": {
        "artifact_stem": "diabetes",
        "positive_label": "Higher Risk Indicator (1 — Model Prediction)",
        "negative_label": "Lower Risk Indicator (0 — Model Prediction)",
        "features": {
            "pregnancies": FeatureSpec(label="Pregnancies", unit="count", min_val=0, max_val=25),
            "glucose": FeatureSpec(label="Glucose", unit="mg/dL", min_val=30, max_val=350),
            "bloodPressure": FeatureSpec(label="Blood Pressure", unit="mm Hg", min_val=20, max_val=180),
            "skinThickness": FeatureSpec(label="Skin Thickness", unit="mm", min_val=1, max_val=120),
            "insulin": FeatureSpec(label="Insulin", unit="µU/mL", min_val=1, max_val=1000),
            "bmi": FeatureSpec(label="BMI", unit="kg/m²", min_val=10, max_val=80),
            "dpf": FeatureSpec(label="Pedigree (DPF)", unit="index", min_val=0.01, max_val=3.5),
            "age": FeatureSpec(label="Age", unit="years", min_val=18, max_val=110),
        },
    },
    "breast-cancer": {
        "artifact_stem": "breast_cancer",
        "positive_label": "Malignant Pattern (1 — Model Prediction)",
        "negative_label": "Benign Pattern (0 — Model Prediction)",
        "features": {
            "meanRadius": FeatureSpec(label="Radius", unit="µm", min_val=4, max_val=40),
            "meanTexture": FeatureSpec(label="Texture", unit="gray-scale std", min_val=5, max_val=50),
            "meanPerimeter": FeatureSpec(label="Perimeter", unit="µm", min_val=30, max_val=250),
            "meanArea": FeatureSpec(label="Area", unit="µm²", min_val=80, max_val=3500),
            "meanSmoothness": FeatureSpec(label="Smoothness", unit="ratio", min_val=0.03, max_val=0.25),
            "meanCompactness": FeatureSpec(label="Compactness", unit="index", min_val=0.01, max_val=0.5),
            "meanConcavity": FeatureSpec(label="Concavity", unit="index", min_val=0.0, max_val=0.6),
            "meanConcavePoints": FeatureSpec(label="Concave Pts", unit="index", min_val=0.0, max_val=0.35),
            "meanSymmetry": FeatureSpec(label="Symmetry", unit="index", min_val=0.05, max_val=0.45),
            "meanFractalDimension": FeatureSpec(label="Fractal Dim", unit="index", min_val=0.03, max_val=0.15),
        },
    },
}


def _reject_non_numeric_feature(value: Any) -> float:
    if isinstance(value, bool):
        raise ValueError("Boolean values are not allowed; provide a finite numeric value.")
    if isinstance(value, str) or not isinstance(value, (int, float)):
        raise ValueError("Feature values must be finite JSON numbers (strings and nulls are rejected).")
    num = float(value)
    if not math.isfinite(num):
        raise ValueError("NaN and Infinity values are not allowed; provide a finite numeric value.")
    return num


FeatureFloat = Annotated[
    float,
    Field(allow_inf_nan=False),
    BeforeValidator(_reject_non_numeric_feature),
]


class PredictionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    features: Dict[str, FeatureFloat] = Field(
        ..., description="Ordered clinical input feature map"
    )


def _parse_cors_origins() -> Tuple[List[str], bool]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").strip()
    if raw == "*":
        return ["*"], False
    origins = [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
    if not origins:
        origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
    return origins, True


def _load_artifacts(app_instance: FastAPI) -> None:
    models: Dict[str, Dict[str, Any]] = {}
    metrics: Dict[str, Dict[str, Any]] = {}
    load_errors: Dict[str, str] = {}

    for disease_id, spec in DISEASE_SCHEMAS.items():
        stem = spec["artifact_stem"]
        model_path = MODEL_DIR / f"{stem}_pipeline.joblib"
        metrics_path = MODEL_DIR / f"{stem}_metrics.json"

        if not model_path.exists():
            load_errors[disease_id] = f"Missing trained pipeline at {model_path.name}"
            continue
        if not metrics_path.exists():
            load_errors[disease_id] = f"Missing evaluation metrics at {metrics_path.name}"
            continue

        try:
            bundle = joblib.load(model_path)
            metrics_data = json.loads(metrics_path.read_text(encoding="utf-8"))
            models[disease_id] = bundle
            metrics[disease_id] = metrics_data
        except Exception as exc:  # pragma: no cover - defensive artifact guard
            load_errors[disease_id] = f"Failed to load artifacts: {type(exc).__name__}"

    app_instance.state.models = models
    app_instance.state.metrics = metrics
    app_instance.state.load_errors = load_errors


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    _load_artifacts(app_instance)
    yield


app = FastAPI(
    title="MEDIPREDICT AI Scikit-learn Service",
    description="Educational healthcare ML inference and evaluation service.",
    version="2.1.0",
    lifespan=lifespan,
)

app.state.rate_limiter = SlidingWindowRateLimiter(
    max_requests=_env_positive_int("RATE_LIMIT_MAX_REQUESTS", DEFAULT_RATE_LIMIT_MAX_REQUESTS),
    window_seconds=_env_positive_int(
        "RATE_LIMIT_WINDOW_SECONDS", DEFAULT_RATE_LIMIT_WINDOW_SECONDS
    ),
)


@app.middleware("http")
async def security_logging_and_rate_limit_middleware(request: Request, call_next):
    started = time.perf_counter()
    path = request.url.path
    method = request.method.upper()

    if method == "POST" and path.startswith("/api/predict/"):
        client_ip = request.client.host if request.client and request.client.host else "unknown"
        allowed, retry_after = app.state.rate_limiter.check(client_ip)
        if not allowed:
            latency_ms = round((time.perf_counter() - started) * 1000, 2)
            logger.warning(
                "request_blocked method=%s path=%s status=429 latency_ms=%.2f",
                method,
                path,
                latency_ms,
            )
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(retry_after)},
                content={
                    "detail": (
                        f"Rate limit exceeded for prediction requests. "
                        f"Retry after {retry_after} second(s)."
                    )
                },
            )

    try:
        response = await call_next(request)
    except Exception as exc:
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        logger.exception(
            "unhandled_error method=%s path=%s error_type=%s latency_ms=%.2f",
            method,
            path,
            type(exc).__name__,
            latency_ms,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal inference service error."},
        )

    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    # Structured metadata only — never log feature payloads or personal health inputs.
    logger.info(
        "request_completed method=%s path=%s status=%d latency_ms=%.2f",
        method,
        path,
        response.status_code,
        latency_ms,
    )
    return response


# Middleware order matters in Starlette (last registered = outermost):
# CORSMiddleware -> RequestSizeLimitMiddleware -> security_logging_and_rate_limit_middleware -> router
app.add_middleware(
    RequestSizeLimitMiddleware,
    max_body_bytes=_env_positive_int("MAX_PREDICT_BODY_BYTES", DEFAULT_MAX_BODY_BYTES, 1024),
)

cors_origins, cors_credentials = _parse_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_credentials,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else json.dumps(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    sanitized_messages: List[str] = []
    for err in exc.errors()[:5]:
        loc = ".".join(str(part) for part in err.get("loc", ()) if part != "body")
        msg = str(err.get("msg", "Invalid input")).strip()
        sanitized_messages.append(f"{loc}: {msg}" if loc else msg)
    summary = "; ".join(sanitized_messages) or "Invalid request payload."
    return JSONResponse(
        status_code=422,
        content={"detail": f"Invalid prediction input payload ({summary})."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "unhandled_exception method=%s path=%s error_type=%s",
        request.method,
        request.url.path,
        type(exc).__name__,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal inference service error."},
    )


def _validate_features(disease_id: str, raw_features: Dict[str, float]) -> Dict[str, float]:
    schema_features: Dict[str, FeatureSpec] = DISEASE_SCHEMAS[disease_id]["features"]
    expected_keys = set(schema_features.keys())
    provided_keys = set(raw_features.keys())

    missing = sorted(expected_keys - provided_keys)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required feature(s) for '{disease_id}': {', '.join(missing)}.",
        )

    unexpected = sorted(provided_keys - expected_keys)
    if unexpected:
        raise HTTPException(
            status_code=422,
            detail=f"Unexpected feature(s) for '{disease_id}': {', '.join(unexpected)}.",
        )

    validated: Dict[str, float] = {}
    for key, spec in schema_features.items():
        val = raw_features[key]
        if not isinstance(val, (int, float)) or isinstance(val, bool) or not math.isfinite(float(val)):
            raise HTTPException(
                status_code=422,
                detail=f"Feature '{key}' ({spec.label}) must be a finite numeric value.",
            )
        num_val = float(val)
        if num_val < spec.min_val or num_val > spec.max_val:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Feature '{key}' ({spec.label}) value {num_val} is outside valid educational "
                    f"bounds [{spec.min_val}, {spec.max_val}]."
                ),
            )
        validated[key] = num_val

    return validated


def _compute_contributions(
    disease_id: str,
    bundle: Dict[str, Any],
    row_df: pd.DataFrame,
    validated_features: Dict[str, float],
) -> List[Dict[str, Any]]:
    pipeline = bundle["pipeline"]
    feature_order: List[str] = bundle["featureOrder"]
    feature_weights: Dict[str, float] = bundle.get("featureWeights", {})
    schema_features: Dict[str, FeatureSpec] = DISEASE_SCHEMAS[disease_id]["features"]

    imputed = pipeline.named_steps["imputer"].transform(row_df)
    scaled = pipeline.named_steps["scaler"].transform(imputed)[0]

    contributions = []
    for idx, key in enumerate(feature_order):
        z_val = float(scaled[idx])
        weight = float(feature_weights.get(key, 0.0))
        # Standardized sensitivity impact clamped for chart readability
        impact = float(np.clip(z_val * weight, -1.5, 1.5))
        direction = "elevating" if impact > 0.03 else "reducing" if impact < -0.03 else "neutral"
        spec = schema_features[key]
        contributions.append(
            {
                "key": key,
                "label": spec.label,
                "value": round(validated_features[key], 4),
                "unit": spec.unit,
                "impact": round(impact, 3),
                "direction": direction,
            }
        )

    contributions.sort(key=lambda item: abs(item["impact"]), reverse=True)
    return contributions[:7]


@app.get("/health")
def health_check() -> Dict[str, Any]:
    if not hasattr(app.state, "models"):
        _load_artifacts(app)

    loaded = sorted(app.state.models.keys())
    missing = sorted(set(DISEASE_SCHEMAS.keys()) - set(loaded))
    return {
        "status": "healthy" if not missing else "degraded",
        "service": "MEDIPREDICT AI Scikit-learn Service",
        "modelsReady": len(missing) == 0,
        "loadedModels": loaded,
        "missingModels": missing,
        "loadErrors": app.state.load_errors,
        "timestampIso": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/models/{disease_id}/metrics")
def get_model_metrics(disease_id: str) -> Dict[str, Any]:
    if disease_id not in DISEASE_SCHEMAS:
        raise HTTPException(status_code=404, detail=f"Unknown disease module '{disease_id}'.")

    if not hasattr(app.state, "metrics"):
        _load_artifacts(app)

    if disease_id not in app.state.metrics:
        reason = app.state.load_errors.get(disease_id, "Model metrics artifact not available.")
        raise HTTPException(
            status_code=503,
            detail=f"Evaluation metrics unavailable for '{disease_id}'. {reason} Run train_models.py.",
        )

    return app.state.metrics[disease_id]


@app.post("/api/predict/{disease_id}")
def predict_disease(disease_id: str, payload: PredictionPayload) -> Dict[str, Any]:
    if disease_id not in DISEASE_SCHEMAS:
        raise HTTPException(status_code=404, detail=f"Unknown disease module '{disease_id}'.")

    if not hasattr(app.state, "models"):
        _load_artifacts(app)

    if disease_id not in app.state.models:
        reason = app.state.load_errors.get(disease_id, "Trained model pipeline not available.")
        raise HTTPException(
            status_code=503,
            detail=f"Trained model unavailable for '{disease_id}'. {reason} Run train_models.py.",
        )

    validated = _validate_features(disease_id, payload.features)
    bundle = app.state.models[disease_id]
    pipeline = bundle["pipeline"]
    feature_order: List[str] = bundle["featureOrder"]

    row_df = pd.DataFrame([[validated[col] for col in feature_order]], columns=feature_order)
    pred_class = int(pipeline.predict(row_df)[0])
    prob = float(pipeline.predict_proba(row_df)[0][1])
    prob = min(1.0, max(0.0, prob))

    schema = DISEASE_SCHEMAS[disease_id]
    predicted_label = schema["positive_label"] if pred_class == 1 else schema["negative_label"]
    risk_tier = (
        "Elevated Model Probability"
        if prob >= 0.65
        else "Moderate Model Probability"
        if prob >= 0.35
        else "Low Model Probability"
    )
    contributions = _compute_contributions(disease_id, bundle, row_df, validated)
    algorithm = bundle.get("algorithm", "Scikit-learn Pipeline")

    return {
        "diseaseId": disease_id,
        "source": "python_sklearn_api",
        "isTrainedModel": True,
        "modelName": bundle.get("modelName", f"{disease_id} Classifier"),
        "algorithm": algorithm,
        "predictedClass": pred_class,
        "predictedLabel": predicted_label,
        "probability": round(prob, 4),
        "riskTier": risk_tier,
        "summaryNote": (
            f"Prediction generated by trained Scikit-learn {algorithm} pipeline "
            f"(educational research use only — not a clinical diagnosis)."
        ),
        "contributions": contributions,
        "timestampIso": datetime.now(timezone.utc).isoformat(),
    }
