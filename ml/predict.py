import sys
import json
import os

# ==============================
# Optional ML imports
# ==============================
RF_AVAILABLE = False
LOGREG_AVAILABLE = False

rf_model = rf_scaler = rf_features = rf_label_mapping = None
logreg_model = logreg_scaler = logreg_features = logreg_label_mapping = None

try:
    import joblib
    import numpy as np

    BASE_DIR = os.path.dirname(__file__)
    MODELS_DIR = os.path.join(BASE_DIR, "ml-api", "models")

    # ---- RF (PSO tuned) ----
    RF_MODEL = os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib")
    RF_SCALER = os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib")
    RF_META = os.path.join(MODELS_DIR, "maternal_risk_meta_multi.json")

    if os.path.exists(RF_MODEL) and os.path.exists(RF_SCALER) and os.path.exists(RF_META):
        rf_model = joblib.load(RF_MODEL)
        rf_scaler = joblib.load(RF_SCALER)
        with open(RF_META) as f:
            meta = json.load(f)
        rf_features = meta["features"]
        rf_label_mapping = {int(v): k for k, v in meta["label_mapping"].items()}
        RF_AVAILABLE = True

    # ---- Logistic Regression ----
    LOGREG_MODEL = os.path.join(MODELS_DIR, "maternal_risk_logreg.joblib")
    LOGREG_SCALER = os.path.join(MODELS_DIR, "maternal_risk_logreg_scaler.joblib")
    LOGREG_META = os.path.join(MODELS_DIR, "maternal_risk_logreg_meta.json")

    if os.path.exists(LOGREG_MODEL) and os.path.exists(LOGREG_SCALER) and os.path.exists(LOGREG_META):
        logreg_model = joblib.load(LOGREG_MODEL)
        logreg_scaler = joblib.load(LOGREG_SCALER)
        with open(LOGREG_META) as f:
            meta = json.load(f)
        logreg_features = meta["features"]
        logreg_label_mapping = {int(v): k for k, v in meta["label_mapping"].items()}
        LOGREG_AVAILABLE = True

except Exception:
    RF_AVAILABLE = False
    LOGREG_AVAILABLE = False


# ==============================
# Heuristic model (safety gate)
# ==============================
def heuristic(features):
    score = 0.1
    reasons = []

    mhr = features.get("maternal_hr")
    sbp = features.get("systolic_bp")
    dbp = features.get("diastolic_bp")
    fhr = features.get("fetal_hr")
    fm = features.get("fetal_movement_count")
    spo2 = features.get("spo2")
    temp = features.get("temperature")

    severe = False

    if mhr and (mhr < 60 or mhr > 120):
        score += 0.3; reasons.append(f"Severe maternal HR ({mhr})"); severe = True
    if sbp and sbp >= 160 or dbp and dbp >= 110:
        score += 0.3; reasons.append(f"Severe hypertension ({sbp}/{dbp})"); severe = True
    if fhr and (fhr < 110 or fhr > 170):
        score += 0.3; reasons.append(f"Severe fetal HR ({fhr})"); severe = True
    if fm is not None and fm <= 2:
        score += 0.25; reasons.append(f"Very low fetal movement ({fm})"); severe = True
    if spo2 and spo2 < 90:
        score += 0.3; reasons.append(f"Hypoxia (SpO₂ {spo2})"); severe = True
    if temp and temp >= 38.5:
        score += 0.2; reasons.append(f"High fever ({temp})"); severe = True

    score = min(1.0, score)

    if severe:
        level = "critical"
    elif score >= 0.35:
        level = "warning"
    else:
        level = "normal"

    return level, score, reasons


# ==============================
# ML helpers
# ==============================
FEATURE_MAP = {
    "Age": "age",
    "SystolicBP": "systolic_bp",
    "DiastolicBP": "diastolic_bp",
    "BS": "bs",
    "BodyTemp": "temperature",
    "HeartRate": "maternal_hr",
}


def run_rf(features):
    if not RF_AVAILABLE:
        return None, None

    row = []
    sbp, dbp = features.get("systolic_bp"), features.get("diastolic_bp")

    for f in rf_features:
        if f == "MAP":
            row.append((sbp + 2 * dbp) / 3)
        elif f == "PulsePressure":
            row.append(sbp - dbp)
        else:
            row.append(float(features.get(FEATURE_MAP[f])))

    x = rf_scaler.transform([row])
    proba = rf_model.predict_proba(x)[0]
    pred = int(rf_model.predict(x)[0])

    return rf_label_mapping[pred], dict(zip(rf_label_mapping.values(), proba))


def run_logreg(features):
    if not LOGREG_AVAILABLE:
        return None, None

    row = [float(features.get(FEATURE_MAP[f])) for f in logreg_features]
    x = logreg_scaler.transform([row])
    proba = logreg_model.predict_proba(x)[0]
    pred = int(logreg_model.predict(x)[0])

    return logreg_label_mapping[pred], dict(zip(logreg_label_mapping.values(), proba))


# ==============================
# FINAL COMBINED DECISION
# ==============================
def decide_final(h_level, rf_level, lr_level):
    if h_level == "critical":
        return "critical"
    if rf_level == "high risk" or lr_level == "high risk":
        return "critical"
    if h_level == "warning" or rf_level == "mid risk" or lr_level == "mid risk":
        return "warning"
    return "normal"


# ==============================
# ENTRYPOINT
# ==============================
def main():
    data = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}

    # numeric coercion
    for k, v in data.items():
        try:
            data[k] = float(v)
        except Exception:
            pass

    h_level, h_score, h_reasons = heuristic(data)
    rf_level, rf_probs = run_rf(data)
    lr_level, lr_probs = run_logreg(data)

    final = decide_final(h_level, rf_level, lr_level)

    print(json.dumps({
        "risk_level": final,
        "risk_score": round(h_score, 3),
        "reason": "; ".join(h_reasons) or "Vitals within safe ranges",
        "model_version": "heuristic+rf+logreg",
        "heuristic_level": h_level,
        "ml_risk_level": rf_level,
        "ml_class_probabilities": rf_probs,
        "ml_logreg_risk_level": lr_level,
        "ml_logreg_class_probabilities": lr_probs
    }))


if __name__ == "__main__":
    main()
