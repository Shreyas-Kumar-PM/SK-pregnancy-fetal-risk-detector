import sys
import json
import os

"""
Hybrid risk model: heuristic + RF (PSO-tuned) + optional Logistic Regression.

Input: JSON on argv[1] with keys (some optional):
  maternal_hr, systolic_bp, diastolic_bp,
  fetal_hr, fetal_movement_count, spo2, temperature,
  age, bs

Output: JSON to stdout:
  {
    "risk_level": "normal|warning|critical",   # final app level (heuristic-based)
    "risk_score": float,                       # heuristic score [0,1]
    "reason": "...",                           # heuristic reasons (+ ML note)
    "model_version": "heuristic_only" | "heuristic+rf_pso_multi",
    "ml_risk_level": "low risk|mid risk|high risk|null",        # RF+PSO
    "ml_class_probabilities": { ... } | null,                   # RF+PSO
    "ml_logreg_risk_level": "low risk|mid risk|high risk|null", # Logistic Regression
    "ml_logreg_class_probabilities": { ... } | null
  }
"""

# ------------------------------
# Optional RF+PSO model integration
# ------------------------------
RF_AVAILABLE = False
rf_model = None
rf_scaler = None
rf_features = None
rf_label_mapping = None

# ------------------------------
# Optional Logistic Regression model integration
# ------------------------------
LOGREG_AVAILABLE = False
logreg_model = None
logreg_scaler = None
logreg_features = None
logreg_label_mapping = None

try:
    import joblib
    import numpy as np

    BASE_DIR = os.path.dirname(__file__)
    MODELS_DIR = os.path.join(BASE_DIR, "models")

    # RF+PSO paths
    RF_MODEL_PATH = os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib")
    RF_SCALER_PATH = os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib")
    RF_META_PATH = os.path.join(MODELS_DIR, "maternal_risk_meta_multi.json")

    # Logistic Regression paths
    LOGREG_MODEL_PATH = os.path.join(MODELS_DIR, "maternal_risk_logreg.joblib")
    LOGREG_SCALER_PATH = os.path.join(MODELS_DIR, "maternal_risk_logreg_scaler.joblib")
    LOGREG_META_PATH = os.path.join(MODELS_DIR, "maternal_risk_logreg_meta.json")

    # Load RF+PSO model if files exist
    if os.path.exists(RF_MODEL_PATH) and os.path.exists(RF_SCALER_PATH) and os.path.exists(RF_META_PATH):
        rf_model = joblib.load(RF_MODEL_PATH)
        rf_scaler = joblib.load(RF_SCALER_PATH)
        with open(RF_META_PATH, "r") as f:
            rf_meta = json.load(f)
        rf_features = rf_meta.get("features", [])
        raw_mapping = rf_meta.get("label_mapping", {})
        rf_label_mapping = {int(v): k for k, v in raw_mapping.items()}
        RF_AVAILABLE = True

    # Load Logistic Regression model if files exist
    if os.path.exists(LOGREG_MODEL_PATH) and os.path.exists(LOGREG_SCALER_PATH) and os.path.exists(LOGREG_META_PATH):
        logreg_model = joblib.load(LOGREG_MODEL_PATH)
        logreg_scaler = joblib.load(LOGREG_SCALER_PATH)
        with open(LOGREG_META_PATH, "r") as f:
            logreg_meta = json.load(f)
        logreg_features = logreg_meta.get("features", [])
        logreg_raw_mapping = logreg_meta.get("label_mapping", {})
        logreg_label_mapping = {int(v): k for k, v in logreg_raw_mapping.items()}
        LOGREG_AVAILABLE = True

except Exception:
    # If anything fails, we just fall back to heuristic-only mode.
    RF_AVAILABLE = False
    LOGREG_AVAILABLE = False


# ------------------------------
# Original heuristic model
# ------------------------------
def compute_risk_heuristic(features):
    score = 0.1  # base low risk
    reasons = []

    mhr = features.get("maternal_hr")
    sbp = features.get("systolic_bp")
    dbp = features.get("diastolic_bp")
    fhr = features.get("fetal_hr")
    fm = features.get("fetal_movement_count")
    spo2 = features.get("spo2")
    temp = features.get("temperature")

    # --- Maternal HR ---
    if mhr is not None:
        if mhr < 60 or mhr > 120:
            score += 0.20
            reasons.append(f"Abnormal maternal HR ({mhr} bpm)")
        elif mhr < 70 or mhr > 110:
            score += 0.10
            reasons.append(f"Borderline maternal HR ({mhr} bpm)")

    # --- Blood pressure ---
    if sbp is not None and dbp is not None:
        if sbp >= 160 or dbp >= 110:
            score += 0.30
            reasons.append(f"Severe hypertension ({sbp}/{dbp} mmHg)")
        elif sbp >= 140 or dbp >= 90:
            score += 0.15
            reasons.append(f"Elevated blood pressure ({sbp}/{dbp} mmHg)")

    # --- Fetal HR ---
    if fhr is not None:
        if fhr < 110 or fhr > 170:
            score += 0.30
            reasons.append(f"Abnormal fetal HR ({fhr} bpm)")
        elif fhr < 120 or fhr > 160:
            score += 0.15
            reasons.append(f"Borderline fetal HR ({fhr} bpm)")

    # --- Fetal movements ---
    if fm is not None:
        if fm <= 2:
            score += 0.25
            reasons.append(f"Very low fetal movement count ({fm})")
        elif fm <= 5:
            score += 0.10
            reasons.append(f"Reduced fetal movement count ({fm})")

    # --- SpO2 ---
    if spo2 is not None:
        if spo2 < 90:
            score += 0.30
            reasons.append(f"Maternal hypoxia (SpO₂ {spo2}%)")
        elif spo2 < 94:
            score += 0.15
            reasons.append(f"Borderline SpO₂ ({spo2}%)")

    # --- Temperature ---
    if temp is not None:
        if temp >= 38.5:
            score += 0.20
            reasons.append(f"High maternal temperature ({temp}°C)")
        elif temp >= 37.8:
            score += 0.10
            reasons.append(f"Borderline maternal temperature ({temp}°C)")

    # Clamp to [0, 1]
    score = max(0.0, min(1.0, score))

    # Risk levels for heuristic
    if score < 0.35:
        level = "normal"
    elif score < 0.7:
        level = "warning"
    else:
        level = "critical"

    if not reasons:
        reasons.append("All vital signs within acceptable ranges based on heuristic model.")

    return {
        "risk_level": level,
        "risk_score": float(round(score, 3)),
        "reason": "; ".join(reasons),
    }


# Common mapping from model feature names to JSON input keys
FEATURE_KEY_MAP = {
    "Age": "age",
    "SystolicBP": "systolic_bp",
    "DiastolicBP": "diastolic_bp",
    "BS": "bs",
    "BodyTemp": "temperature",
    "HeartRate": "maternal_hr",
}


# ------------------------------
# RF+PSO risk model (optional)
# ------------------------------
def compute_risk_ml_rf(features):
    if not RF_AVAILABLE:
        return None

    if rf_model is None or rf_scaler is None or rf_features is None or rf_label_mapping is None:
        return None

    # We'll need SBP/DBP for engineered features
    sbp = features.get("systolic_bp")
    dbp = features.get("diastolic_bp")

    row = []
    for feat_name in rf_features:
        # Engineered features computed from SBP/DBP
        if feat_name == "MAP":
            if sbp is None or dbp is None:
                return None
            try:
                map_val = (float(sbp) + 2.0 * float(dbp)) / 3.0
            except (TypeError, ValueError):
                return None
            row.append(map_val)
            continue

        if feat_name == "PulsePressure":
            if sbp is None or dbp is None:
                return None
            try:
                pp_val = float(sbp) - float(dbp)
            except (TypeError, ValueError):
                return None
            row.append(pp_val)
            continue

        # Normal base features (Age, SystolicBP, DiastolicBP, BS, BodyTemp, HeartRate)
        json_key = FEATURE_KEY_MAP.get(feat_name)
        if json_key is None:
            # Unknown feature name in meta – safer to bail out
            return None
        value = features.get(json_key)
        if value is None:
            return None
        try:
            row.append(float(value))
        except (TypeError, ValueError):
            return None

    x = np.array([row], dtype=float)
    x_scaled = rf_scaler.transform(x)

    proba = rf_model.predict_proba(x_scaled)[0]
    pred_class = int(rf_model.predict(x_scaled)[0])

    risk_label = rf_label_mapping.get(pred_class, "unknown")

    class_proba = {
        rf_label_mapping.get(int(cls), str(cls)): float(p)
        for cls, p in enumerate(proba)
    }

    return {
        "risk_level": risk_label,
        "class_probabilities": class_proba,
    }

# ------------------------------
# Logistic Regression risk model (optional)
# ------------------------------
def compute_risk_ml_logreg(features):
    if not LOGREG_AVAILABLE:
        return None

    if logreg_model is None or logreg_scaler is None or logreg_features is None or logreg_label_mapping is None:
        return None

    row = []
    for feat_name in logreg_features:
        json_key = FEATURE_KEY_MAP.get(feat_name)
        if json_key is None:
            return None
        value = features.get(json_key)
        if value is None:
            return None
        try:
            row.append(float(value))
        except (TypeError, ValueError):
            return None

    x = np.array([row], dtype=float)
    x_scaled = logreg_scaler.transform(x)

    proba = logreg_model.predict_proba(x_scaled)[0]
    pred_class = int(logreg_model.predict(x_scaled)[0])

    risk_label = logreg_label_mapping.get(pred_class, "unknown")

    class_proba = {
        logreg_label_mapping.get(int(cls), str(cls)): float(p)
        for cls, p in enumerate(proba)
    }

    return {
        "risk_level": risk_label,
        "class_probabilities": class_proba,
    }


# ------------------------------
# Main entrypoint
# ------------------------------
def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "risk_level": "normal",
            "risk_score": 0.1,
            "reason": "No input provided to model.",
            "model_version": "heuristic_only",
            "ml_risk_level": None,
            "ml_class_probabilities": None,
            "ml_logreg_risk_level": None,
            "ml_logreg_class_probabilities": None,
        }))
        return

    try:
        data = json.loads(sys.argv[1])
    except Exception as e:
        print(json.dumps({
            "risk_level": "normal",
            "risk_score": 0.1,
            "reason": f"Invalid JSON input: {str(e)}",
            "model_version": "heuristic_only",
            "ml_risk_level": None,
            "ml_class_probabilities": None,
            "ml_logreg_risk_level": None,
            "ml_logreg_class_probabilities": None,
        }))
        return

    # Try to coerce numeric strings into floats
    for key in list(data.keys()):
        if isinstance(data[key], str):
            try:
                data[key] = float(data[key])
            except ValueError:
                pass

    # 1) Always compute heuristic first – this defines the final risk level
    heuristic = compute_risk_heuristic(data)

    final_level = heuristic["risk_level"]
    final_score = heuristic["risk_score"]
    final_reason = heuristic["reason"]
    model_version = "heuristic_only"

    # 2) RF+PSO opinion
    rf_result = compute_risk_ml_rf(data)
    ml_label = None
    ml_probs = None

    if rf_result is not None:
        raw_ml_label = rf_result["risk_level"]
        ml_probs = rf_result["class_probabilities"]

        ml_label = raw_ml_label

        # Optional safety: downgrade "high risk" if heuristic is clearly normal
        if heuristic["risk_level"] == "normal" and raw_ml_label == "high risk":
            ml_label = "mid risk"
            final_reason = (
                heuristic["reason"]
                + " | ML (RF, PSO-tuned) found a pattern similar to high-risk "
                  "patients in the training data, but current vitals are normal; "
                  "flagged as mid risk for follow-up."
            )
        else:
            final_reason = (
                heuristic["reason"]
                + f" | ML (RF, PSO-tuned) indicates {ml_label}."
            )

        model_version = "heuristic+rf_pso_multi"

    # 3) Logistic Regression opinion (independent)
    logreg_result = compute_risk_ml_logreg(data)
    ml_logreg_label = None
    ml_logreg_probs = None

    if logreg_result is not None:
        ml_logreg_label = logreg_result["risk_level"]
        ml_logreg_probs = logreg_result["class_probabilities"]
        # We do NOT change final_level / final_score / reason here to avoid confusion.
        # You can mention it in the reason if you want, but keeping it separate is cleaner.

    output = {
        "risk_level": final_level,                     # heuristic only
        "risk_score": final_score,                     # heuristic only
        "reason": final_reason,                        # heuristic + RF note
        "model_version": model_version,                # heuristic_only or heuristic+rf_pso_multi
        "ml_risk_level": ml_label,                     # RF+PSO
        "ml_class_probabilities": ml_probs,            # RF+PSO
        "ml_logreg_risk_level": ml_logreg_label,       # Logistic Regression
        "ml_logreg_class_probabilities": ml_logreg_probs,
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
