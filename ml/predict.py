import sys
import json
import os

# ------------------------------
# Safe imports (ML optional)
# ------------------------------
try:
    import joblib
    import numpy as np
    SKLEARN_AVAILABLE = True
except Exception:
    SKLEARN_AVAILABLE = False


# ------------------------------
# Paths
# ------------------------------
BASE_DIR = os.path.dirname(__file__)

# IMPORTANT:
# Models are inside ml/ml-api/models
MODELS_DIR = os.path.abspath(
    os.path.join(BASE_DIR, "ml-api", "models")
)

# ------------------------------
# Load models (optional)
# ------------------------------
RF_AVAILABLE = False
LOGREG_AVAILABLE = False

rf_model = rf_scaler = rf_features = rf_label_mapping = None
logreg_model = logreg_scaler = logreg_features = logreg_label_mapping = None

if SKLEARN_AVAILABLE and os.path.isdir(MODELS_DIR):
    try:
        # RF + PSO
        rf_model_path = os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib")
        rf_scaler_path = os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib")
        rf_meta_path = os.path.join(MODELS_DIR, "maternal_risk_meta_multi.json")

        if os.path.exists(rf_model_path):
            rf_model = joblib.load(rf_model_path)
            rf_scaler = joblib.load(rf_scaler_path)
            with open(rf_meta_path) as f:
                meta = json.load(f)

            rf_features = meta["features"]
            rf_label_mapping = {int(v): k for k, v in meta["label_mapping"].items()}
            RF_AVAILABLE = True
    except Exception:
        RF_AVAILABLE = False

    try:
        # Logistic Regression
        logreg_model_path = os.path.join(MODELS_DIR, "maternal_risk_logreg.joblib")
        logreg_scaler_path = os.path.join(MODELS_DIR, "maternal_risk_logreg_scaler.joblib")
        logreg_meta_path = os.path.join(MODELS_DIR, "maternal_risk_logreg_meta.json")

        if os.path.exists(logreg_model_path):
            logreg_model = joblib.load(logreg_model_path)
            logreg_scaler = joblib.load(logreg_scaler_path)
            with open(logreg_meta_path) as f:
                meta = json.load(f)

            logreg_features = meta["features"]
            logreg_label_mapping = {int(v): k for k, v in meta["label_mapping"].items()}
            LOGREG_AVAILABLE = True
    except Exception:
        LOGREG_AVAILABLE = False


# ------------------------------
# Heuristic model (CORE)
# ------------------------------
def compute_heuristic(data):
    score = 0.1
    reasons = []

    def bump(val, reason):
        nonlocal score
        score += val
        reasons.append(reason)

    if data.get("maternal_hr", 0) > 120:
        bump(0.2, "High maternal heart rate")

    if data.get("systolic_bp", 0) >= 140 or data.get("diastolic_bp", 0) >= 90:
        bump(0.2, "Elevated blood pressure")

    if data.get("fetal_hr", 0) < 110 or data.get("fetal_hr", 0) > 170:
        bump(0.3, "Abnormal fetal heart rate")

    if data.get("fetal_movement_count", 10) <= 3:
        bump(0.25, "Low fetal movement")

    if data.get("spo2", 100) < 94:
        bump(0.2, "Low SpO2")

    if data.get("temperature", 36.8) >= 38:
        bump(0.2, "High temperature")

    score = max(0.0, min(score, 1.0))

    if score < 0.35:
        level = "normal"
    elif score < 0.7:
        level = "warning"
    else:
        level = "critical"

    if not reasons:
        reasons.append("Vitals within normal range")

    return level, round(score, 3), "; ".join(reasons)


# ------------------------------
# Main
# ------------------------------
def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "risk_level": "normal",
            "risk_score": 0.1,
            "reason": "No input provided",
            "model_version": "heuristic_only",
            "ml_risk_level": None,
            "ml_class_probabilities": None,
            "ml_logreg_risk_level": None,
            "ml_logreg_class_probabilities": None
        }))
        return

    data = json.loads(sys.argv[1])

    # Heuristic first
    risk_level, risk_score, reason = compute_heuristic(data)

    output = {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "reason": reason,
        "model_version": "heuristic_only",
        "ml_risk_level": None,
        "ml_class_probabilities": None,
        "ml_logreg_risk_level": None,
        "ml_logreg_class_probabilities": None
    }

    # RF model
    if RF_AVAILABLE:
        try:
            row = []
            for f in rf_features:
                if f == "MAP":
                    row.append((data["systolic_bp"] + 2 * data["diastolic_bp"]) / 3)
                elif f == "PulsePressure":
                    row.append(data["systolic_bp"] - data["diastolic_bp"])
                else:
                    row.append(float(data.get(f.lower(), 0)))

            X = rf_scaler.transform([row])
            proba = rf_model.predict_proba(X)[0]
            pred = int(rf_model.predict(X)[0])

            output["ml_risk_level"] = rf_label_mapping.get(pred)
            output["ml_class_probabilities"] = {
                rf_label_mapping.get(i): float(p)
                for i, p in enumerate(proba)
            }
            output["model_version"] = "heuristic+rf"
        except Exception:
            pass

    # Logistic Regression
    if LOGREG_AVAILABLE:
        try:
            row = [float(data.get(f.lower(), 0)) for f in logreg_features]
            X = logreg_scaler.transform([row])
            proba = logreg_model.predict_proba(X)[0]
            pred = int(logreg_model.predict(X)[0])

            output["ml_logreg_risk_level"] = logreg_label_mapping.get(pred)
            output["ml_logreg_class_probabilities"] = {
                logreg_label_mapping.get(i): float(p)
                for i, p in enumerate(proba)
            }
        except Exception:
            pass

    print(json.dumps(output))


if __name__ == "__main__":
    main()
