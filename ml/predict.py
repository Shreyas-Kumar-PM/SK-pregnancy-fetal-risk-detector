import sys
import json
import os

# ======================================================
# Optional ML imports
# ======================================================
RF_AVAILABLE = False
LOGREG_AVAILABLE = False

rf_model = rf_scaler = rf_features = rf_label_mapping = None
logreg_model = logreg_scaler = logreg_features = logreg_label_mapping = None

try:
    import joblib
    import numpy as np

    BASE_DIR = os.path.dirname(__file__)
    MODELS_DIR = os.path.join(BASE_DIR, "ml-api", "models")

    # -------- RF (PSO tuned) --------
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

    # -------- Logistic Regression --------
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


# ======================================================
# Heuristic model (clinical rules)
# ======================================================
def heuristic_analysis(features):
    score = 0.1
    reasons = []
    flags = []

    def add(reason, weight, severe=False):
        nonlocal score
        score += weight
        reasons.append(reason)
        if severe:
            flags.append("severe")

    mhr = features.get("maternal_hr")
    sbp = features.get("systolic_bp")
    dbp = features.get("diastolic_bp")
    fhr = features.get("fetal_hr")
    fm = features.get("fetal_movement_count")
    spo2 = features.get("spo2")
    temp = features.get("temperature")

    if mhr and (mhr < 60 or mhr > 120):
        add(f"Severely abnormal maternal heart rate ({mhr} bpm)", 0.3, True)
    elif mhr and (mhr < 70 or mhr > 110):
        add(f"Borderline maternal heart rate ({mhr} bpm)", 0.15)

    if sbp and dbp:
        if sbp >= 160 or dbp >= 110:
            add(f"Severe hypertension ({sbp}/{dbp} mmHg)", 0.3, True)
        elif sbp >= 140 or dbp >= 90:
            add(f"Elevated blood pressure ({sbp}/{dbp} mmHg)", 0.15)

    if fhr and (fhr < 110 or fhr > 170):
        add(f"Abnormal fetal heart rate ({fhr} bpm)", 0.3, True)
    elif fhr and (fhr < 120 or fhr > 160):
        add(f"Borderline fetal heart rate ({fhr} bpm)", 0.15)

    if fm is not None:
        if fm <= 2:
            add(f"Very low fetal movement count ({fm})", 0.25, True)
        elif fm <= 5:
            add(f"Reduced fetal movement count ({fm})", 0.1)

    if spo2 and spo2 < 90:
        add(f"Maternal hypoxia detected (SpO₂ {spo2}%)", 0.3, True)
    elif spo2 and spo2 < 94:
        add(f"Borderline oxygen saturation (SpO₂ {spo2}%)", 0.15)

    if temp and temp >= 38.5:
        add(f"High maternal temperature ({temp}°C)", 0.2, True)
    elif temp and temp >= 37.8:
        add(f"Borderline maternal temperature ({temp}°C)", 0.1)

    score = min(1.0, score)

    if "severe" in flags:
        level = "critical"
    elif score >= 0.35:
        level = "warning"
    else:
        level = "normal"

    if not reasons:
        reasons.append("All vital signs within clinically acceptable ranges.")

    return {
        "level": level,
        "score": round(score, 3),
        "reasons": reasons
    }


# ======================================================
# ML helpers
# ======================================================
FEATURE_MAP = {
    "Age": "age",
    "SystolicBP": "systolic_bp",
    "DiastolicBP": "diastolic_bp",
    "BS": "bs",
    "BodyTemp": "temperature",
    "HeartRate": "maternal_hr",
}


def rf_analysis(features):
    if not RF_AVAILABLE:
        return None

    sbp, dbp = features.get("systolic_bp"), features.get("diastolic_bp")
    row = []

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
    label = rf_label_mapping[pred]

    return {
        "risk_level": label,
        "probabilities": dict(zip(rf_label_mapping.values(), map(float, proba))),
        "interpretation": f"Random Forest model classified this case as '{label}' based on learned population patterns."
    }


def logreg_analysis(features):
    if not LOGREG_AVAILABLE:
        return None

    row = [float(features.get(FEATURE_MAP[f])) for f in logreg_features]
    x = logreg_scaler.transform([row])
    proba = logreg_model.predict_proba(x)[0]
    pred = int(logreg_model.predict(x)[0])
    label = logreg_label_mapping[pred]

    return {
        "risk_level": label,
        "probabilities": dict(zip(logreg_label_mapping.values(), map(float, proba))),
        "interpretation": f"Logistic Regression indicates a '{label}' risk based on linear feature contributions."
    }


# ======================================================
# Final decision logic
# ======================================================
def combine_decision(h, rf, lr):
    if h["level"] == "critical":
        return "critical", "Critical condition identified by heuristic clinical rules."
    if rf and rf["risk_level"] == "high risk":
        return "critical", "ML Random Forest detected high-risk patterns."
    if lr and lr["risk_level"] == "high risk":
        return "critical", "Logistic Regression detected high-risk probability."
    if h["level"] == "warning" or (rf and rf["risk_level"] == "mid risk"):
        return "warning", "Moderate risk detected; closer monitoring recommended."
    return "normal", "No significant risk detected across models."


# ======================================================
# ENTRYPOINT
# ======================================================
def main():
    data = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}

    for k, v in data.items():
        try:
            data[k] = float(v)
        except Exception:
            pass

    heuristic = heuristic_analysis(data)
    rf = rf_analysis(data)
    logreg = logreg_analysis(data)

    final_level, final_reason = combine_decision(heuristic, rf, logreg)

    output = {
        "final_risk_level": final_level,
        "final_explanation": final_reason,
        "heuristic_analysis": heuristic,
        "rf_analysis": rf,
        "logistic_regression_analysis": logreg,
        "model_version": "heuristic + random_forest + logistic_regression"
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
