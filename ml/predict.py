import sys
import json
import os
import traceback

import numpy as np
import joblib

# ------------------------------
# Path-safe base directory
# ------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# ------------------------------
# Load models safely
# ------------------------------
def safe_load(path):
    return joblib.load(path) if os.path.exists(path) else None

rf_model = safe_load(os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib"))
rf_scaler = safe_load(os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib"))

logreg_model = safe_load(os.path.join(MODELS_DIR, "maternal_risk_logreg.joblib"))
logreg_scaler = safe_load(os.path.join(MODELS_DIR, "maternal_risk_logreg_scaler.joblib"))

# ------------------------------
# Heuristic model
# ------------------------------
def heuristic(features):
    score = 0.1
    reasons = []

    if features["systolic_bp"] >= 160 or features["diastolic_bp"] >= 110:
        score += 0.4
        reasons.append("Severe hypertension detected")

    if features["fetal_hr"] < 110 or features["fetal_hr"] > 170:
        score += 0.3
        reasons.append("Abnormal fetal heart rate")

    if features["spo2"] < 94:
        score += 0.2
        reasons.append("Low maternal oxygen saturation")

    score = min(score, 1.0)

    level = "normal"
    if score >= 0.7:
        level = "critical"
    elif score >= 0.35:
        level = "warning"

    return level, score, reasons

# ------------------------------
# ML prediction helpers
# ------------------------------
def rf_predict(x):
    if not rf_model:
        return None, None
    x = rf_scaler.transform([x])
    probs = rf_model.predict_proba(x)[0]
    cls = rf_model.predict(x)[0]
    return cls, probs.tolist()

def logreg_predict(x):
    if not logreg_model:
        return None, None
    x = logreg_scaler.transform([x])
    probs = logreg_model.predict_proba(x)[0]
    cls = logreg_model.predict(x)[0]
    return cls, probs.tolist()

# ------------------------------
# MAIN
# ------------------------------
try:
    data = json.loads(sys.argv[1])

    # Defaults (ABSOLUTELY CRITICAL)
    features = {
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

    # Heuristic
    h_level, h_score, h_reasons = heuristic(features)

    # ML feature vector (trained order)
    ml_x = [
        features["age"],
        features["systolic_bp"],
        features["diastolic_bp"],
        features["bs"],
        features["temperature"],
        features["maternal_hr"],
    ]

    rf_cls, rf_probs = rf_predict(ml_x)
    lg_cls, lg_probs = logreg_predict(ml_x)

    output = {
        "risk_level": h_level,
        "risk_score": round(h_score, 2),
        "reason": "; ".join(h_reasons) if h_reasons else "Vitals within normal ranges",

        "model_version": "heuristic + RF + logistic",

        "ml_risk_level": str(rf_cls),
        "ml_class_probabilities": rf_probs,

        "ml_logreg_risk_level": str(lg_cls),
        "ml_logreg_class_probabilities": lg_probs,
    }

    print(json.dumps(output))

except Exception as e:
    print(json.dumps({
        "risk_level": "critical",
        "risk_score": 1.0,
        "reason": "ML failure: " + str(e),
        "model_version": "error",
        "trace": traceback.format_exc()
    }))
