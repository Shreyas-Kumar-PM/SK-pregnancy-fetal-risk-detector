import sys
import json
import os

"""
Hybrid risk model: heuristic + RF (PSO-tuned) + optional Logistic Regression.

Input:
- JSON via argv[1] (CLI mode) OR
- JSON via stdin (FastAPI mode)

Output: JSON to stdout
"""

# ==========================================================
# 🔥 INPUT HANDLING (CLI + FastAPI compatible)
# ==========================================================
def read_input():
    if len(sys.argv) > 1:
        return sys.argv[1]
    return sys.stdin.read()


# ==========================================================
# OPTIONAL MODEL LOADING
# ==========================================================
RF_AVAILABLE = False
LOGREG_AVAILABLE = False

rf_model = None
rf_scaler = None
rf_features = None
rf_label_mapping = None

logreg_model = None
logreg_scaler = None
logreg_features = None
logreg_label_mapping = None

try:
    import joblib
    import numpy as np

    BASE_DIR = os.path.dirname(__file__)
    MODELS_DIR = os.path.join(BASE_DIR, "models")

    # RF + PSO
    RF_MODEL_PATH = os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib")
    RF_SCALER_PATH = os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib")
    RF_META_PATH = os.path.join(MODELS_DIR, "maternal_risk_meta_multi.json")

    # Logistic Regression
    LOGREG_MODEL_PATH = os.path.join(MODELS_DIR, "maternal_risk_logreg.joblib")
    LOGREG_SCALER_PATH = os.path.join(MODELS_DIR, "maternal_risk_logreg_scaler.joblib")
    LOGREG_META_PATH = os.path.join(MODELS_DIR, "maternal_risk_logreg_meta.json")

    # Load RF + PSO
    if os.path.exists(RF_MODEL_PATH) and os.path.exists(RF_SCALER_PATH) and os.path.exists(RF_META_PATH):
        rf_model = joblib.load(RF_MODEL_PATH)
        rf_scaler = joblib.load(RF_SCALER_PATH)
        with open(RF_META_PATH) as f:
            meta = json.load(f)
        rf_features = meta.get("features", [])
        rf_label_mapping = {int(v): k for k, v in meta.get("label_mapping", {}).items()}
        RF_AVAILABLE = True

    # Load Logistic Regression
    if os.path.exists(LOGREG_MODEL_PATH) and os.path.exists(LOGREG_SCALER_PATH) and os.path.exists(LOGREG_META_PATH):
        logreg_model = joblib.load(LOGREG_MODEL_PATH)
        logreg_scaler = joblib.load(LOGREG_SCALER_PATH)
        with open(LOGREG_META_PATH) as f:
            meta = json.load(f)
        logreg_features = meta.get("features", [])
        logreg_label_mapping = {int(v): k for k, v in meta.get("label_mapping", {}).items()}
        LOGREG_AVAILABLE = True

except Exception:
    RF_AVAILABLE = False
    LOGREG_AVAILABLE = False


# ==========================================================
# HEURISTIC MODEL (PRIMARY DECISION MAKER)
# ==========================================================
def compute_risk_heuristic(f):
    score = 0.1
    reasons = []

    def add(points, msg):
        nonlocal score
        score += points
        reasons.append(msg)

    if f.get("maternal_hr") is not None:
        if f["maternal_hr"] < 60 or f["maternal_hr"] > 120:
            add(0.20, f"Abnormal maternal HR ({f['maternal_hr']} bpm)")
        elif f["maternal_hr"] < 70 or f["maternal_hr"] > 110:
            add(0.10, f"Borderline maternal HR ({f['maternal_hr']} bpm)")

    if f.get("systolic_bp") and f.get("diastolic_bp"):
        sbp, dbp = f["systolic_bp"], f["diastolic_bp"]
        if sbp >= 160 or dbp >= 110:
            add(0.30, f"Severe hypertension ({sbp}/{dbp} mmHg)")
        elif sbp >= 140 or dbp >= 90:
            add(0.15, f"Elevated blood pressure ({sbp}/{dbp} mmHg)")

    if f.get("fetal_hr") is not None:
        if f["fetal_hr"] < 110 or f["fetal_hr"] > 170:
            add(0.30, f"Abnormal fetal HR ({f['fetal_hr']} bpm)")
        elif f["fetal_hr"] < 120 or f["fetal_hr"] > 160:
            add(0.15, f"Borderline fetal HR ({f['fetal_hr']} bpm)")

    if f.get("fetal_movement_count") is not None:
        if f["fetal_movement_count"] <= 2:
            add(0.25, f"Very low fetal movement count ({f['fetal_movement_count']})")
        elif f["fetal_movement_count"] <= 5:
            add(0.10, f"Reduced fetal movement count ({f['fetal_movement_count']})")

    if f.get("spo2") is not None:
        if f["spo2"] < 90:
            add(0.30, f"Maternal hypoxia (SpO₂ {f['spo2']}%)")
        elif f["spo2"] < 94:
            add(0.15, f"Borderline SpO₂ ({f['spo2']}%)")

    if f.get("temperature") is not None:
        if f["temperature"] >= 38.5:
            add(0.20, f"High maternal temperature ({f['temperature']}°C)")
        elif f["temperature"] >= 37.8:
            add(0.10, f"Borderline maternal temperature ({f['temperature']}°C)")

    score = max(0.0, min(1.0, score))

    if score < 0.35:
        level = "normal"
    elif score < 0.7:
        level = "warning"
    else:
        level = "critical"

    if not reasons:
        reasons.append("All vital signs within acceptable ranges.")

    return level, round(score, 3), "; ".join(reasons)


# ==========================================================
# FEATURE MAP FOR ML MODELS
# ==========================================================
FEATURE_MAP = {
    "Age": "age",
    "SystolicBP": "systolic_bp",
    "DiastolicBP": "diastolic_bp",
    "BS": "bs",
    "BodyTemp": "temperature",
    "HeartRate": "maternal_hr",
}


# ==========================================================
# ML HELPERS
# ==========================================================
def run_logreg(f):
    if not LOGREG_AVAILABLE:
        return None

    row = []
    for feat in logreg_features:
        key = FEATURE_MAP.get(feat)
        if key is None or f.get(key) is None:
            return None
        row.append(float(f[key]))

    x = logreg_scaler.transform([row])
    probs = logreg_model.predict_proba(x)[0]

    return {
        "risk_level": logreg_label_mapping[int(probs.argmax())],
        "class_probabilities": {
            logreg_label_mapping[i]: float(p) for i, p in enumerate(probs)
        }
    }


# ==========================================================
# MAIN
# ==========================================================
def main():
    raw = read_input()
    if not raw:
        print(json.dumps({"risk_level": "normal", "risk_score": 0.1}))
        return

    try:
        data = json.loads(raw)
    except Exception as e:
        print(json.dumps({"risk_level": "normal", "risk_score": 0.1, "reason": str(e)}))
        return

    for k in data:
        try:
            data[k] = float(data[k])
        except Exception:
            pass

    level, score, reason = compute_risk_heuristic(data)

    logreg = run_logreg(data)

    output = {
        "risk_level": level,
        "risk_score": score,
        "reason": reason,
        "model_version": "heuristic+logreg",
        "ml_logreg_risk_level": logreg["risk_level"] if logreg else None,
        "ml_logreg_class_probabilities": logreg["class_probabilities"] if logreg else None
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
