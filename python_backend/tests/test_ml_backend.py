import json
import logging
from pathlib import Path
import re
import sys

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app as backend_app  # noqa: E402
import train_models  # noqa: E402

VALID_PAYLOADS = {
    "heart": {
        "age": 54,
        "sex": 1,
        "cp": 3,
        "trestbps": 140,
        "chol": 250,
        "fbs": 0,
        "restecg": 1,
        "thalach": 142,
        "exang": 1,
        "oldpeak": 1.8,
        "slope": 1,
        "ca": 1,
        "thal": 3,
    },
    "diabetes": {
        "pregnancies": 3,
        "glucose": 152,
        "bloodPressure": 78,
        "skinThickness": 26,
        "insulin": 140,
        "bmi": 33.6,
        "dpf": 0.62,
        "age": 42,
    },
    "breast-cancer": {
        "meanRadius": 17.99,
        "meanTexture": 10.38,
        "meanPerimeter": 122.8,
        "meanArea": 1001.0,
        "meanSmoothness": 0.1184,
        "meanCompactness": 0.2776,
        "meanConcavity": 0.3001,
        "meanConcavePoints": 0.1471,
        "meanSymmetry": 0.2419,
        "meanFractalDimension": 0.0787,
    },
}


def _extract_ts_schema_keys(schema_path: Path) -> list[str]:
    text = schema_path.read_text(encoding="utf-8")
    return re.findall(r"key:\s*'([a-zA-Z0-9_]+)'", text)


def test_datasets_are_strictly_separated_and_valid():
    heart_x, heart_y, _ = train_models.load_heart_dataset()
    diab_x, diab_y, _ = train_models.load_diabetes_dataset()
    bc_x, bc_y, _ = train_models.load_breast_cancer_dataset()

    assert list(heart_x.columns) == train_models.HEART_FEATURES
    assert len(heart_x) == len(heart_y) >= 290

    assert list(diab_x.columns) == train_models.DIABETES_FEATURES
    assert len(diab_x) == len(diab_y) == 768

    assert list(bc_x.columns) == train_models.BREAST_CANCER_FEATURES
    assert len(bc_x) == len(bc_y) == 569
    assert int(bc_y.sum()) == 212


def test_saved_model_artifacts_and_frontend_schema_parity():
    schema_files = {
        "heart": ROOT_DIR / "src" / "modules" / "heart" / "schema.ts",
        "diabetes": ROOT_DIR / "src" / "modules" / "diabetes" / "schema.ts",
        "breast-cancer": ROOT_DIR / "src" / "modules" / "breastCancer" / "schema.ts",
    }

    with TestClient(backend_app.app):
        assert set(backend_app.app.state.models.keys()) == {"heart", "diabetes", "breast-cancer"}
        assert backend_app.app.state.load_errors == {}

        for disease_id, ts_file in schema_files.items():
            bundle = backend_app.app.state.models[disease_id]
            metrics = backend_app.app.state.metrics[disease_id]
            backend_keys = list(backend_app.DISEASE_SCHEMAS[disease_id]["features"].keys())
            ts_keys = _extract_ts_schema_keys(ts_file)

            assert bundle["featureOrder"] == backend_keys
            assert metrics["featureOrder"] == backend_keys
            assert ts_keys == backend_keys


def test_health_and_metrics_endpoints():
    with TestClient(backend_app.app) as client:
        health_resp = client.get("/health")
        assert health_resp.status_code == 200
        health = health_resp.json()
        assert health["status"] == "healthy"
        assert health["modelsReady"] is True
        assert set(health["loadedModels"]) == {"heart", "diabetes", "breast-cancer"}

        for disease_id in ("heart", "diabetes", "breast-cancer"):
            metrics_resp = client.get(f"/api/models/{disease_id}/metrics")
            assert metrics_resp.status_code == 200
            m = metrics_resp.json()
            assert m["diseaseId"] == disease_id
            assert m["status"] == "connected_sklearn"
            assert 0.5 < m["accuracy"] <= 1.0
            assert 0.0 <= m["precision"] <= 1.0
            assert 0.0 <= m["recall"] <= 1.0
            assert 0.0 <= m["f1Score"] <= 1.0
            assert 0.5 < m["rocAuc"] <= 1.0
            cm = m["confusionMatrix"]
            total_cm = (
                cm["truePositive"] + cm["falsePositive"] + cm["falseNegative"] + cm["trueNegative"]
            )
            assert total_cm == m["testRows"]

        unknown_resp = client.get("/api/models/unknown/metrics")
        assert unknown_resp.status_code == 404
        assert isinstance(unknown_resp.json()["detail"], str)


def test_valid_predictions_for_all_three_models():
    backend_app.app.state.rate_limiter.reset(max_requests=60, window_seconds=60)
    with TestClient(backend_app.app) as client:
        for disease_id, features in VALID_PAYLOADS.items():
            resp = client.post(f"/api/predict/{disease_id}", json={"features": features})
            assert resp.status_code == 200
            data = resp.json()
            assert data["diseaseId"] == disease_id
            assert data["source"] == "python_sklearn_api"
            assert data["isTrainedModel"] is True
            assert data["predictedClass"] in (0, 1)
            assert 0.0 <= data["probability"] <= 1.0
            assert isinstance(data["riskTier"], str) and data["riskTier"]
            assert len(data["contributions"]) > 0


def test_strict_validation_rejects_missing_extra_bool_non_numeric_nan_infinity_and_unknown():
    backend_app.app.state.rate_limiter.reset(max_requests=60, window_seconds=60)
    with TestClient(backend_app.app) as client:
        # 1. Missing required feature -> 422
        bad_missing = dict(VALID_PAYLOADS["heart"])
        bad_missing.pop("chol")
        resp_missing = client.post("/api/predict/heart", json={"features": bad_missing})
        assert resp_missing.status_code == 422
        assert isinstance(resp_missing.json()["detail"], str)

        # 2. Extra feature inside features map -> 422
        bad_extra_feature = dict(VALID_PAYLOADS["heart"])
        bad_extra_feature["unexpectedField"] = 1
        resp_extra_feature = client.post(
            "/api/predict/heart", json={"features": bad_extra_feature}
        )
        assert resp_extra_feature.status_code == 422
        assert isinstance(resp_extra_feature.json()["detail"], str)

        # 3. Extra top-level body property -> 422
        resp_extra_top = client.post(
            "/api/predict/heart",
            json={"features": VALID_PAYLOADS["heart"], "adminOverride": True},
        )
        assert resp_extra_top.status_code == 422
        assert isinstance(resp_extra_top.json()["detail"], str)

        # 4. Out-of-range value -> 422
        bad_range = dict(VALID_PAYLOADS["diabetes"])
        bad_range["glucose"] = 9999
        resp_range = client.post("/api/predict/diabetes", json={"features": bad_range})
        assert resp_range.status_code == 422

        # 5. Boolean values must not be coerced to 0.0/1.0 floats -> 422
        for bool_val in (True, False):
            bad_bool_binary = dict(VALID_PAYLOADS["heart"])
            bad_bool_binary["sex"] = bool_val
            resp_bool_binary = client.post("/api/predict/heart", json={"features": bad_bool_binary})
            assert resp_bool_binary.status_code == 422

        bad_bool_continuous = dict(VALID_PAYLOADS["breast-cancer"])
        bad_bool_continuous["meanRadius"] = True
        resp_bool_continuous = client.post(
            "/api/predict/breast-cancer", json={"features": bad_bool_continuous}
        )
        assert resp_bool_continuous.status_code == 422

        # 6. Non-numeric string and null inputs -> 422
        for bad_val in ("abc", "54", None, [54]):
            bad_non_num = dict(VALID_PAYLOADS["heart"])
            bad_non_num["age"] = bad_val  # type: ignore[assignment]
            resp_non_num = client.post("/api/predict/heart", json={"features": bad_non_num})
            assert resp_non_num.status_code == 422
            assert isinstance(resp_non_num.json()["detail"], str)

        # 7. NaN, Infinity, and -Infinity in raw JSON body -> 422
        for raw_token in ("NaN", "Infinity", "-Infinity"):
            raw_features = dict(VALID_PAYLOADS["heart"])
            raw_features["age"] = "__TOKEN__"  # type: ignore[assignment]
            raw_json = json.dumps({"features": raw_features}).replace('"__TOKEN__"', raw_token)
            resp_inf_nan = client.post(
                "/api/predict/heart",
                content=raw_json,
                headers={"Content-Type": "application/json"},
            )
            assert resp_inf_nan.status_code == 422
            assert isinstance(resp_inf_nan.json()["detail"], str)

        # 8. Unknown disease ID -> 404
        resp_unknown = client.post("/api/predict/invalid", json={"features": VALID_PAYLOADS["heart"]})
        assert resp_unknown.status_code == 404
        assert isinstance(resp_unknown.json()["detail"], str)


def test_request_size_limit_rejects_oversized_payload_with_413():
    backend_app.app.state.rate_limiter.reset(max_requests=60, window_seconds=60)
    oversized_value = "x" * (backend_app.DEFAULT_MAX_BODY_BYTES + 1024)
    oversized_body = json.dumps({"features": {"age": oversized_value}})

    with TestClient(backend_app.app) as client:
        resp = client.post(
            "/api/predict/heart",
            content=oversized_body,
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 413
        body = resp.json()
        assert isinstance(body["detail"], str)
        assert "exceeds maximum allowed size" in body["detail"]


def test_prediction_rate_limiting_returns_429_with_retry_after():
    backend_app.app.state.rate_limiter.reset(max_requests=3, window_seconds=60)
    try:
        with TestClient(backend_app.app) as client:
            for _ in range(3):
                ok_resp = client.post(
                    "/api/predict/diabetes",
                    json={"features": VALID_PAYLOADS["diabetes"]},
                )
                assert ok_resp.status_code == 200

            blocked_resp = client.post(
                "/api/predict/diabetes",
                json={"features": VALID_PAYLOADS["diabetes"]},
            )
            assert blocked_resp.status_code == 429
            assert "Retry-After" in blocked_resp.headers
            assert int(blocked_resp.headers["Retry-After"]) >= 1
            assert isinstance(blocked_resp.json()["detail"], str)
    finally:
        backend_app.app.state.rate_limiter.reset(max_requests=60, window_seconds=60)


def test_unhandled_exception_returns_safe_500_without_stack_trace():
    backend_app.app.state.rate_limiter.reset(max_requests=60, window_seconds=60)

    class BrokenPipeline:
        def predict(self, _df):
            raise RuntimeError("sensitive_internal_stack_detail_should_not_leak")

    with TestClient(backend_app.app, raise_server_exceptions=False) as client:
        original_bundle = backend_app.app.state.models["heart"]
        backend_app.app.state.models["heart"] = {
            **original_bundle,
            "pipeline": BrokenPipeline(),
        }
        try:
            resp = client.post("/api/predict/heart", json={"features": VALID_PAYLOADS["heart"]})
            assert resp.status_code == 500
            assert resp.json() == {"detail": "Internal inference service error."}
            assert "RuntimeError" not in resp.text
            assert "sensitive_internal_stack_detail" not in resp.text
            assert "Traceback" not in resp.text
        finally:
            backend_app.app.state.models["heart"] = original_bundle


def test_structured_logging_omits_feature_values(caplog):
    backend_app.app.state.rate_limiter.reset(max_requests=60, window_seconds=60)
    sentinel_features = dict(VALID_PAYLOADS["heart"])
    sentinel_features["chol"] = 437
    sentinel_features["trestbps"] = 189

    with caplog.at_level(logging.INFO, logger="medipredict.api"):
        with TestClient(backend_app.app) as client:
            resp = client.post("/api/predict/heart", json={"features": sentinel_features})
            assert resp.status_code == 200

    log_output = "\n".join(rec.getMessage() for rec in caplog.records)
    assert "/api/predict/heart" in log_output
    assert "status=200" in log_output
    assert "437" not in log_output
    assert "189" not in log_output
    assert "chol" not in log_output
    assert "trestbps" not in log_output
