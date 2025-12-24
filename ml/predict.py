import sys
import json
import os
import traceback
import numpy as np
import joblib

# ------------------------------
# Paths (ROOT-based)
# ------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# ------------------------------
# Safe model loading
# ------------------------------
def load(path):
    return joblib.load(path) if os.path.exists(path) else None


rf_model = load(os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib"))
rf_scaler = load(os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib"))

logreg_model = load(os.path.join(MODELS_DIR, "maternal_risk_logreg.joblib"))
logreg_scaler = load(os.path.join(MODELS_DIR, "maternal_risk_logreg_scaler.joblib"))

LABELS = ["low", "medium", "high"]

# ------------------------------
# Heuristic model (authoritative)
# ------------------------------
def heuristic(f):
    score = 0.1
    reasons = []

    if f["systolic_bp"] >= 170 or f["diastolic_bp"] >= 110:
        score += 0.45
        reasons.append("Severe hypertension")

    if f["fetal_hr"] < 110 or f["fetal_hr"] > 170:
        score += 0.35
        reasons.append("Abnormal fetal heart rate")

    if f["spo2"] < 92:
        score += 0.30
        reasons.append("Maternal hypoxia")

    if f["temperature"] >= 39:
        score += 0.25
        reasons.append("High maternal fever")

    score = min(score, 1.0)

    if score >= 0.7:
        level = "critical"
    elif score >= 0.35:
        level = "warning"
    else:
        level = "normal"

    return level, round(score, 2), reasons


def ml_predict(model, scaler, x):
    if not model or not scaler:
        return None, None
    x = scaler.transform([x])
    probs = model.predict_proba(x)[0]
    idx = int(np.argmax(probs))
    return LABELS[idx], probs.tolist()


# ------------------------------
# MAIN ENTRY
# ------------------------------
try:
    data = json.loads(sys.argv[1])

    # 🔒 Defaults are CRITICAL
    f = {
        "maternal_hr": float(data.get("maternal_hr", 90)),
        "systolic_bp": float(data.get("systolic_bp", 120)),
        "diastolic_bp": float(data.get("diastolic_bp", 80)),
        "fetal_hr": float(data.get("fetal_hr", 140)),
        "fetal_movement_count": int(data.get("fetal_movement_count", 10)),
        "spo2": float(data.get("spo2", 98)),
        "temperature": float(data.get("temperature", 36.8)),
        "age": float(data.get("age", 25)),
        "bs": float(data.get("bs", 90)),
    }

    # 1️⃣ Heuristic
    h_level, h_score, h_reasons = heuristic(f)

    # 2️⃣ ML feature vector (training order)
    x = [
        f["age"],
        f["systolic_bp"],
        f["diastolic_bp"],
        f["bs"],
        f["temperature"],
        f["maternal_hr"],
    ]

    rf_level, rf_probs = ml_predict(rf_model, rf_scaler, x)
    lg_level, lg_probs = ml_predict(logreg_model, logreg_scaler, x)

    print(json.dumps({
        "risk_level": h_level,
        "risk_score": h_score,
        "reason": "; ".join(h_reasons) if h_reasons else "Vitals within safe limits",
        "model_version": "heuristic + RF + logistic",

        "ml_risk_level": rf_level,
        "ml_class_probabilities": rf_probs,

        "ml_logreg_risk_level": lg_level,
        "ml_logreg_class_probabilities": lg_probs
    }))

except Exception as e:
    print(json.dumps({
        "risk_level": "critical",
        "risk_score": 1.0,
        "reason": f"ML fatal error: {str(e)}",
        "model_version": "error",
        "trace": traceback.format_exc()
    }))
