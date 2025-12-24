import sys
import json
import os
import joblib
import numpy as np

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "models")

# ---------------- Load Models Safely ----------------
def safe_load(path):
    return joblib.load(path) if os.path.exists(path) else None

rf_model = safe_load(os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib"))
rf_scaler = safe_load(os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib"))

logreg_model = safe_load(os.path.join(MODELS_DIR, "maternal_risk_logreg.joblib"))
logreg_scaler = safe_load(os.path.join(MODELS_DIR, "maternal_risk_logreg_scaler.joblib"))

# ---------------- Heuristic ----------------
def heuristic(features):
    score = 0.1
    reasons = []

    mhr = features.get("maternal_hr", 90)
    sbp = features.get("systolic_bp", 120)
    dbp = features.get("diastolic_bp", 80)
    fhr = features.get("fetal_hr", 140)
    fm  = features.get("fetal_movement_count", 10)
    spo2 = features.get("spo2", 98)
    temp = features.get("temperature", 36.8)

    if mhr < 60 or mhr > 120:
        score += 0.2
        reasons.append(f"Abnormal maternal HR ({mhr})")

    if sbp >= 140 or dbp >= 90:
        score += 0.2
        reasons.append(f"High BP ({sbp}/{dbp})")

    if fhr < 110 or fhr > 170:
        score += 0.25
        reasons.append(f"Abnormal fetal HR ({fhr})")

    if fm <= 3:
        score += 0.2
        reasons.append(f"Low fetal movement ({fm})")

    if spo2 < 94:
        score += 0.15
        reasons.append(f"Low SpO₂ ({spo2}%)")

    if temp >= 38:
        score += 0.15
        reasons.append(f"High temperature ({temp}°C)")

    score = min(score, 1.0)

    level = "normal"
    if score >= 0.7:
        level = "critical"
    elif score >= 0.35:
        level = "warning"

    if not reasons:
        reasons.append("All vitals within safe ranges.")

    return level, round(score, 2), reasons

# ---------------- RF ----------------
def rf_predict(features):
    if not rf_model or not rf_scaler:
        return "unknown", {}

    X = np.array([[ 
        features["age"],
        features["systolic_bp"],
        features["diastolic_bp"],
        features["bs"],
        features["temperature"],
        features["maternal_hr"]
    ]])

    Xs = rf_scaler.transform(X)
    probs = rf_model.predict_proba(Xs)[0]

    labels = ["low", "mid", "high"]
    risk = labels[int(np.argmax(probs))]

    return risk, dict(zip(labels, probs.tolist()))

# ---------------- LogReg ----------------
def logreg_predict(features):
    if not logreg_model or not logreg_scaler:
        return "unknown", {}

    X = np.array([[ 
        features["age"],
        features["systolic_bp"],
        features["diastolic_bp"],
        features["bs"],
        features["maternal_hr"]
    ]])

    Xs = logreg_scaler.transform(X)
    probs = logreg_model.predict_proba(Xs)[0]

    labels = ["low", "mid", "high"]
    risk = labels[int(np.argmax(probs))]

    return risk, dict(zip(labels, probs.tolist()))

# ---------------- Main ----------------
def main():
    try:
        data = json.loads(sys.argv[1])
    except Exception:
        print(json.dumps({
            "risk_level": "normal",
            "risk_score": 0.1,
            "reason": "Invalid input",
        }))
        return

    # defaults
    data.setdefault("age", 25)
    data.setdefault("bs", 90)

    h_level, h_score, h_reasons = heuristic(data)
    rf_level, rf_probs = rf_predict(data)
    lr_level, lr_probs = logreg_predict(data)

    # 🔥 FINAL DECISION LOGIC
    final_level = h_level
    if "high" in (rf_level, lr_level):
        final_level = "critical"
    elif "mid" in (rf_level, lr_level) and h_level != "normal":
        final_level = "warning"

    final_reason = (
        " | ".join(h_reasons) +
        f" | RF: {rf_level} | LogReg: {lr_level}"
    )

    output = {
        "risk_level": final_level,
        "risk_score": h_score,
        "reason": final_reason,
        "model_version": "heuristic+rf+logreg",

        "heuristic": {
            "risk_level": h_level,
            "risk_score": h_score,
            "reasons": h_reasons
        },
        "rf": {
            "risk_level": rf_level,
            "probabilities": rf_probs
        },
        "logreg": {
            "risk_level": lr_level,
            "probabilities": lr_probs
        }
    }

    print(json.dumps(output))

if __name__ == "__main__":
    main()
