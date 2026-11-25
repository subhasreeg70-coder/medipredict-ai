"""
MEDIPREDICT AI — Leakage-Free Scikit-learn Training & Evaluation Pipeline

Trains three strictly isolated binary classification pipelines using genuine public datasets:
  1. Heart Disease: UCI Cleveland Heart Disease dataset (303 rows, 13 features)
  2. Diabetes: Pima Indians Diabetes dataset (768 rows, 8 features)
  3. Breast Cancer: Wisconsin Diagnostic Breast Cancer (WDBC) dataset (569 rows, 10 mean features)

Leakage Prevention Guarantee:
  - Stratified train/test split (80/20, random_state=42) is executed BEFORE any
    imputation, scaling, cross-validation, or estimator fitting.
  - All preprocessing (SimpleImputer + StandardScaler) is encapsulated inside a
    Scikit-learn Pipeline so statistics are learned strictly from X_train.
  - Model selection uses 5-fold StratifiedKFold cross-validation strictly inside X_train.
  - Final evaluation metrics (Accuracy, Precision, Recall, F1, ROC-AUC, Confusion Matrix)
    are computed once on the untouched held-out test split.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Callable, Dict, List, Tuple
import urllib.request

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "datasets"
MODEL_DIR = BASE_DIR / "saved_models"

UCI_HEART_URL = (
    "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data"
)
PIMA_DIABETES_URL = (
    "https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv"
)

HEART_FEATURES = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "fbs",
    "restecg",
    "thalach",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal",
]

DIABETES_FEATURES = [
    "pregnancies",
    "glucose",
    "bloodPressure",
    "skinThickness",
    "insulin",
    "bmi",
    "dpf",
    "age",
]

BREAST_CANCER_FEATURES = [
    "meanRadius",
    "meanTexture",
    "meanPerimeter",
    "meanArea",
    "meanSmoothness",
    "meanCompactness",
    "meanConcavity",
    "meanConcavePoints",
    "meanSymmetry",
    "meanFractalDimension",
]


def _download_file(url: str, dest: Path, force_refresh: bool = False) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and not force_refresh:
        return dest
    req = urllib.request.Request(url, headers={"User-Agent": "MediPredict-ML-Trainer/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read()
    if not content:
        raise RuntimeError(f"Empty download received from {url}")
    dest.write_bytes(content)
    return dest


def load_heart_dataset(force_refresh: bool = False) -> Tuple[pd.DataFrame, pd.Series, str]:
    raw_path = DATA_DIR / "uci_cleveland_heart_raw.data"
    clean_csv_path = DATA_DIR / "heart_cleveland.csv"

    if clean_csv_path.exists() and not force_refresh:
        df = pd.read_csv(clean_csv_path)
    else:
        _download_file(UCI_HEART_URL, raw_path, force_refresh=force_refresh)
        cols = HEART_FEATURES + ["num"]
        df = pd.read_csv(raw_path, header=None, names=cols, na_values="?")

        # Align categorical encodings strictly with frontend schema (src/modules/heart/schema.ts):
        # UCI raw cp: 1..4 -> 0..3
        df["cp"] = pd.to_numeric(df["cp"], errors="coerce") - 1
        # UCI raw slope: 1=upsloping, 2=flat, 3=downsloping -> UI: 0=downsloping, 1=flat, 2=upsloping
        df["slope"] = pd.to_numeric(df["slope"], errors="coerce").map({1: 2, 2: 1, 3: 0})
        # UCI raw thal: 3=normal, 6=fixed defect, 7=reversible defect -> UI: 1=fixed, 2=normal, 3=reversible
        df["thal"] = pd.to_numeric(df["thal"], errors="coerce").map({6.0: 1.0, 3.0: 2.0, 7.0: 3.0})
        df["ca"] = pd.to_numeric(df["ca"], errors="coerce")
        df["target"] = (pd.to_numeric(df["num"], errors="raise") > 0).astype(int)
        df = df[HEART_FEATURES + ["target"]]
        df.to_csv(clean_csv_path, index=False)

    # Dataset validation
    assert len(df) >= 290, f"Expected >=290 UCI Heart rows, got {len(df)}"
    assert list(df.columns) == HEART_FEATURES + ["target"], "Unexpected Heart schema columns"
    assert set(df["target"].dropna().unique()).issubset({0, 1}), "Invalid Heart target values"

    X = df[HEART_FEATURES].astype(float)
    y = df["target"].astype(int)
    return X, y, "UCI Cleveland Heart Disease Dataset (processed.cleveland.data)"


def load_diabetes_dataset(force_refresh: bool = False) -> Tuple[pd.DataFrame, pd.Series, str]:
    clean_csv_path = DATA_DIR / "pima_diabetes.csv"

    if clean_csv_path.exists() and not force_refresh:
        df = pd.read_csv(clean_csv_path)
    else:
        raw_path = DATA_DIR / "pima_diabetes_raw.csv"
        _download_file(PIMA_DIABETES_URL, raw_path, force_refresh=force_refresh)
        cols = DIABETES_FEATURES + ["target"]
        df = pd.read_csv(raw_path, header=None, names=cols)
        # Convert biologically impossible zero readings to NaN so SimpleImputer fits strictly on X_train
        for col in ["glucose", "bloodPressure", "skinThickness", "insulin", "bmi"]:
            df[col] = pd.to_numeric(df[col], errors="coerce").replace(0, np.nan)
        df["target"] = pd.to_numeric(df["target"], errors="raise").astype(int)
        df.to_csv(clean_csv_path, index=False)

    assert len(df) == 768, f"Expected 768 Pima Diabetes rows, got {len(df)}"
    assert list(df.columns) == DIABETES_FEATURES + ["target"], "Unexpected Diabetes schema columns"
    assert set(df["target"].dropna().unique()).issubset({0, 1}), "Invalid Diabetes target values"

    X = df[DIABETES_FEATURES].astype(float)
    y = df["target"].astype(int)
    return X, y, "Pima Indians Diabetes Dataset (NIDDK / UCI Benchmark)"


def load_breast_cancer_dataset(force_refresh: bool = False) -> Tuple[pd.DataFrame, pd.Series, str]:
    clean_csv_path = DATA_DIR / "wdbc_breast_cancer.csv"

    if clean_csv_path.exists() and not force_refresh:
        df = pd.read_csv(clean_csv_path)
    else:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        bunch = load_breast_cancer(as_frame=True)
        raw = bunch.frame
        rename_map = {
            "mean radius": "meanRadius",
            "mean texture": "meanTexture",
            "mean perimeter": "meanPerimeter",
            "mean area": "meanArea",
            "mean smoothness": "meanSmoothness",
            "mean compactness": "meanCompactness",
            "mean concavity": "meanConcavity",
            "mean concave points": "meanConcavePoints",
            "mean symmetry": "meanSymmetry",
            "mean fractal dimension": "meanFractalDimension",
        }
        df = raw[list(rename_map.keys())].rename(columns=rename_map).copy()
        # In sklearn load_breast_cancer: 0 = malignant, 1 = benign.
        # Map to clinical risk convention matching schema.ts: 1 = Malignant (212), 0 = Benign (357).
        df["target"] = (raw["target"] == 0).astype(int)
        df.to_csv(clean_csv_path, index=False)

    assert len(df) == 569, f"Expected 569 WDBC Breast Cancer rows, got {len(df)}"
    assert list(df.columns) == BREAST_CANCER_FEATURES + ["target"], "Unexpected WDBC columns"
    assert int(df["target"].sum()) == 212, "Expected 212 malignant positive cases in WDBC"

    X = df[BREAST_CANCER_FEATURES].astype(float)
    y = df["target"].astype(int)
    return X, y, "Wisconsin Diagnostic Breast Cancer (WDBC) Dataset (10 Mean Nuclei Features)"


def _candidate_pipelines(disease_id: str) -> Dict[str, Pipeline]:
    """Build leakage-free candidate Pipelines for 5-fold CV selection on X_train."""
    if disease_id == "heart":
        return {
            "LogisticRegression(C=0.5)": Pipeline(
                [
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler()),
                    ("classifier", LogisticRegression(C=0.5, max_iter=2000, random_state=42)),
                ]
            ),
            "RandomForestClassifier(n=250, depth=5)": Pipeline(
                [
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler()),
                    (
                        "classifier",
                        RandomForestClassifier(
                            n_estimators=250,
                            max_depth=5,
                            min_samples_leaf=3,
                            random_state=42,
                        ),
                    ),
                ]
            ),
            "GradientBoostingClassifier(n=120, lr=0.05)": Pipeline(
                [
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler()),
                    (
                        "classifier",
                        GradientBoostingClassifier(
                            n_estimators=120,
                            learning_rate=0.05,
                            max_depth=3,
                            random_state=42,
                        ),
                    ),
                ]
            ),
        }

    if disease_id == "diabetes":
        return {
            "LogisticRegression(C=1.0)": Pipeline(
                [
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler()),
                    ("classifier", LogisticRegression(C=1.0, max_iter=2000, random_state=42)),
                ]
            ),
            "GradientBoostingClassifier(n=150, lr=0.04)": Pipeline(
                [
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler()),
                    (
                        "classifier",
                        GradientBoostingClassifier(
                            n_estimators=150,
                            learning_rate=0.04,
                            max_depth=3,
                            random_state=42,
                        ),
                    ),
                ]
            ),
            "RandomForestClassifier(n=250, depth=6)": Pipeline(
                [
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler()),
                    (
                        "classifier",
                        RandomForestClassifier(
                            n_estimators=250,
                            max_depth=6,
                            min_samples_leaf=4,
                            random_state=42,
                        ),
                    ),
                ]
            ),
        }

    # breast-cancer
    return {
        "CalibratedSVC(RBF, C=1.0)": Pipeline(
            [
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                (
                    "classifier",
                    CalibratedClassifierCV(
                        SVC(kernel="rbf", C=1.0, random_state=42),
                        ensemble=False,
                    ),
                ),
            ]
        ),
        "LogisticRegression(C=1.0)": Pipeline(
            [
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                ("classifier", LogisticRegression(C=1.0, max_iter=2000, random_state=42)),
            ]
        ),
        "RandomForestClassifier(n=250, depth=6)": Pipeline(
            [
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                (
                    "classifier",
                    RandomForestClassifier(n_estimators=250, max_depth=6, random_state=42),
                ),
            ]
        ),
    }


def _compute_feature_direction_weights(
    pipeline: Pipeline,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    feature_order: List[str],
) -> Dict[str, float]:
    """
    Derive signed feature attribution weights strictly from X_train + fitted estimator
    (coefficients for linear models; feature_importances_ * train correlation sign for tree/SVC).
    """
    clf = pipeline.named_steps["classifier"]

    if hasattr(clf, "coef_"):
        coefs = np.asarray(clf.coef_, dtype=float).ravel()
        return {col: round(float(coefs[idx]), 6) for idx, col in enumerate(feature_order)}

    # Compute sign from X_train correlation with y_train (leakage-free)
    imputed_train = pd.DataFrame(
        pipeline.named_steps["imputer"].transform(X_train),
        columns=feature_order,
    )
    signs = {}
    for col in feature_order:
        corr = imputed_train[col].corr(y_train.reset_index(drop=True))
        signs[col] = 1.0 if (pd.isna(corr) or corr >= 0) else -1.0

    if hasattr(clf, "feature_importances_"):
        importances = np.asarray(clf.feature_importances_, dtype=float).ravel()
        return {
            col: round(float(importances[idx] * signs[col]), 6)
            for idx, col in enumerate(feature_order)
        }

    # For kernel models (e.g., SVC), scale by absolute train correlation magnitude
    corrs = {
        col: abs(float(imputed_train[col].corr(y_train.reset_index(drop=True)) or 0.0))
        for col in feature_order
    }
    total = sum(corrs.values()) or 1.0
    return {
        col: round((corrs[col] / total) * signs[col], 6) for col in feature_order
    }


def train_disease_module(
    disease_id: str,
    model_name: str,
    endpoint_path: str,
    artifact_stem: str,
    feature_order: List[str],
    loader: Callable[[bool], Tuple[pd.DataFrame, pd.Series, str]],
    force_refresh: bool = False,
) -> Dict[str, Any]:
    X, y, dataset_source = loader(force_refresh)

    # STRICT LEAKAGE-FREE SPLIT: hold out 20% stratified test set BEFORE any fitting
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        stratify=y,
        random_state=42,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    candidates = _candidate_pipelines(disease_id)

    best_name = ""
    best_pipeline: Pipeline | None = None
    best_cv_mean = -1.0
    best_cv_std = 0.0
    candidate_scores: Dict[str, float] = {}

    for name, pipe in candidates.items():
        scores = cross_val_score(pipe, X_train, y_train, cv=cv, scoring="roc_auc")
        mean_score = float(np.mean(scores))
        candidate_scores[name] = round(mean_score, 4)
        if mean_score > best_cv_mean:
            best_cv_mean = mean_score
            best_cv_std = float(np.std(scores))
            best_name = name
            best_pipeline = pipe

    assert best_pipeline is not None, f"No candidate pipeline selected for {disease_id}"

    # Fit selected pipeline exclusively on X_train, y_train
    best_pipeline.fit(X_train, y_train)

    # Evaluate once on untouched held-out X_test, y_test
    y_pred = best_pipeline.predict(X_test)
    y_proba = best_pipeline.predict_proba(X_test)[:, 1]

    tn, fp, fn, tp = confusion_matrix(y_test, y_pred, labels=[0, 1]).ravel()
    accuracy = float(accuracy_score(y_test, y_pred))
    precision = float(precision_score(y_test, y_pred, zero_division=0))
    recall = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_proba))

    feature_weights = _compute_feature_direction_weights(
        best_pipeline, X_train, y_train, feature_order
    )

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    pipeline_path = MODEL_DIR / f"{artifact_stem}_pipeline.joblib"
    metrics_path = MODEL_DIR / f"{artifact_stem}_metrics.json"

    bundle = {
        "diseaseId": disease_id,
        "pipeline": best_pipeline,
        "featureOrder": feature_order,
        "featureWeights": feature_weights,
        "algorithm": best_name,
        "modelName": model_name,
    }
    joblib.dump(bundle, pipeline_path)

    trained_at = datetime.now(timezone.utc).isoformat()
    metrics_payload: Dict[str, Any] = {
        "diseaseId": disease_id,
        "modelName": model_name,
        "algorithm": best_name,
        "plannedAlgorithm": best_name,
        "endpointPath": endpoint_path,
        "status": "connected_sklearn",
        "statusLabel": f"Trained Scikit-learn Pipeline ({best_name})",
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1Score": round(f1, 4),
        "rocAuc": round(roc_auc, 4),
        "confusionMatrix": {
            "truePositive": int(tp),
            "falsePositive": int(fp),
            "falseNegative": int(fn),
            "trueNegative": int(tn),
        },
        "trainRows": int(len(X_train)),
        "testRows": int(len(X_test)),
        "totalRows": int(len(X)),
        "positiveTestCount": int(y_test.sum()),
        "negativeTestCount": int((y_test == 0).sum()),
        "cvRocAucMean": round(best_cv_mean, 4),
        "cvRocAucStd": round(best_cv_std, 4),
        "candidateCvRocAuc": candidate_scores,
        "pipelineSteps": ["SimpleImputer(median)", "StandardScaler()", best_name],
        "splitStrategy": "Stratified 80/20 Train-Test Split (random_state=42)",
        "datasetSource": dataset_source,
        "featureOrder": feature_order,
        "featureWeights": feature_weights,
        "trainedAtIso": trained_at,
    }
    metrics_path.write_text(json.dumps(metrics_payload, indent=2), encoding="utf-8")
    return metrics_payload


def train_all(force_refresh: bool = False) -> List[Dict[str, Any]]:
    specs = [
        (
            "heart",
            "Heart Disease Classifier",
            "/api/predict/heart",
            "heart",
            HEART_FEATURES,
            load_heart_dataset,
        ),
        (
            "diabetes",
            "Diabetes Classifier",
            "/api/predict/diabetes",
            "diabetes",
            DIABETES_FEATURES,
            load_diabetes_dataset,
        ),
        (
            "breast-cancer",
            "Breast Cancer Classifier",
            "/api/predict/breast-cancer",
            "breast_cancer",
            BREAST_CANCER_FEATURES,
            load_breast_cancer_dataset,
        ),
    ]

    results = []
    for spec in specs:
        res = train_disease_module(*spec, force_refresh=force_refresh)
        results.append(res)
        cm = res["confusionMatrix"]
        print(
            f"[{res['diseaseId']}] {res['algorithm']} | "
            f"rows={res['totalRows']} (train={res['trainRows']}, test={res['testRows']}) | "
            f"acc={res['accuracy']:.4f} prec={res['precision']:.4f} "
            f"rec={res['recall']:.4f} f1={res['f1Score']:.4f} roc_auc={res['rocAuc']:.4f} | "
            f"CM(TP={cm['truePositive']}, FP={cm['falsePositive']}, "
            f"FN={cm['falseNegative']}, TN={cm['trueNegative']})"
        )
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train MediPredict AI Scikit-learn models.")
    parser.add_argument(
        "--refresh-data",
        action="store_true",
        help="Re-download public datasets instead of using cached CSVs.",
    )
    args = parser.parse_args()
    train_all(force_refresh=args.refresh_data)
