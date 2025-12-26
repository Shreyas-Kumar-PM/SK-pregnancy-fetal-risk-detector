import sys
import json
import os
import traceback
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

def safe_load(path):
    return joblib.load(path) if os.path.exists(path) else None

rf_model = safe_load(os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib"))
rf_scaler = safe_load(os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib"))

logreg_model = safe_load(os.path.join(MODELS_DIR, "maternal_risk_logreg.joblib"))
logreg_scaler = safe_load(os.path.join(MODELS_DIR, "maternal_risk_logreg_scaler.joblib"))

CLASS_SCORE = {0: 0.1, 1: 0.55, 2: 0.9}

def heuristic(features):
    score = 0.1
    reasons = []

    if features["systolic_bp"] >= 160 or features["diastolic_bp"] >= 110:
        score += 0.35
        reasons.append("Severe hypertension detected")

    elif features["systolic_bp"] >= 140 or features["diastolic_bp"] >= 90:
        score += 0.2
        reasons.append("Elevated blood pressure")

    if features["fetal_hr"] < 110 or features["fetal_hr"] > 170:
        score += 0.25
        reasons.append("Abnormal fetal heart rate")

    if features["spo2"] < 94:
        score += 0.2
        reasons.append("Low maternal oxygen saturation")

    if features["temperature"] >= 38:
        score += 0.15
        reasons.append("Maternal fever detected")

    return min(score, 1.0), reasons

def model_predict(model, scaler, x):
    if not model or not scaler:
        return None, None
    x = scaler.transform([x])
    probs = model.predict_proba(x)[0]
    cls = int(np.argmax(probs))
    return cls, probs.tolist()

try:
    data = json.loads(sys.argv[1])

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

    heuristic_score, heuristic_reasons = heuristic(features)

    map_val = (features["systolic_bp"] + 2 * features["diastolic_bp"]) / 3
    pulse_pressure = features["systolic_bp"] - features["diastolic_bp"]

    ml_x = [
        features["age"],
        features["systolic_bp"],
        features["diastolic_bp"],
        features["bs"],
        features["temperature"],
        features["maternal_hr"],
        map_val,
        pulse_pressure,
    ]
    rf_cls, rf_probs = model_predict(rf_model, rf_scaler, ml_x)
    lr_cls, lr_probs = model_predict(logreg_model, logreg_scaler, ml_x)

    ml_scores = []
    if rf_cls is not None:
        ml_scores.append(CLASS_SCORE[rf_cls])
    if lr_cls is not None:
        ml_scores.append(CLASS_SCORE[lr_cls])

    ml_score = np.mean(ml_scores) if ml_scores else heuristic_score

    # 🔥 FINAL FUSION
    final_score = round(
        (0.4 * heuristic_score) + (0.6 * ml_score),
        2
    )

    if final_score >= 0.75:
        level = "critical"
    elif final_score >= 0.35:
        level = "warning"
    else:
        level = "normal"

    reasons = heuristic_reasons or ["Vitals within acceptable ranges"]

    print(json.dumps({
        "risk_level": level,
        "risk_score": final_score,
        "reason": "; ".join(reasons),
        "model_version": "heuristic + RF + logistic (fused)",

        "ml_risk_level": rf_cls,
        "ml_class_probabilities": rf_probs,

        "ml_logreg_risk_level": lr_cls,
        "ml_logreg_class_probabilities": lr_probs,
    }))

except Exception as e:
    print(json.dumps({
        "risk_level": "critical",
        "risk_score": 1.0,
        "reason": "ML system failure",
        "model_version": "error",
        "error": str(e),
        "trace": traceback.format_exc()
    }))
