@app.post("/predict")
def predict(data: RiskInput):
    f = data.dict()

    # -------------------------
    # Heuristic FIRST (absolute gate)
    # -------------------------
    h_score = 0.0
    h_reasons = []

    if f["systolic_bp"] >= 160 or f["diastolic_bp"] >= 110:
        h_score += 0.4
        h_reasons.append("Severe hypertension")

    if f["fetal_hr"] < 110 or f["fetal_hr"] > 170:
        h_score += 0.3
        h_reasons.append("Abnormal fetal heart rate")

    if f["spo2"] < 92:
        h_score += 0.2
        h_reasons.append("Low maternal oxygen saturation")

    if f["temperature"] >= 38.5:
        h_score += 0.15
        h_reasons.append("High maternal temperature")

    # ---- Heuristic decision ----
    if h_score < 0.25:
        # 🚨 HARD STOP: ML CANNOT ESCALATE
        return {
            "risk_level": "normal",
            "risk_score": 0.15,
            "reason": "Vitals within normal clinical limits",
            "model_version": "heuristic-gated",
            "ml_risk_level": None,
            "ml_class_probabilities": None,
            "ml_logreg_risk_level": None,
            "ml_logreg_class_probabilities": None,
        }

    # -------------------------
    # ML ALLOWED ONLY NOW
    # -------------------------
    map_val = (f["systolic_bp"] + 2 * f["diastolic_bp"]) / 3
    pulse_pressure = f["systolic_bp"] - f["diastolic_bp"]

    x_rf = np.array([[f["age"], f["systolic_bp"], f["diastolic_bp"],
                      f["bs"], f["temperature"], f["maternal_hr"],
                      map_val, pulse_pressure]])

    x_lr = np.array([[f["age"], f["systolic_bp"], f["diastolic_bp"],
                      f["bs"], f["temperature"], f["maternal_hr"]]])

    rf_probs = rf_model.predict_proba(rf_scaler.transform(x_rf))[0]
    lr_probs = logreg_model.predict_proba(logreg_scaler.transform(x_lr))[0]

    rf_class = int(np.argmax(rf_probs))
    lr_class = int(np.argmax(lr_probs))

    ml_votes = (rf_class >= 1) + (lr_class >= 1)

    # -------------------------
    # FINAL DECISION
    # -------------------------
    if h_score >= 0.6 and ml_votes >= 1:
        final_level = "critical"
        final_score = 0.85

    elif h_score >= 0.25:
        final_level = "warning"
        final_score = 0.45

    else:
        final_level = "normal"
        final_score = 0.2

    return {
        "risk_level": final_level,
        "risk_score": final_score,
        "reason": "; ".join(h_reasons),
        "model_version": "heuristic-gated RF + logistic",

        "ml_risk_level": rf_class,
        "ml_class_probabilities": rf_probs.tolist(),

        "ml_logreg_risk_level": lr_class,
        "ml_logreg_class_probabilities": lr_probs.tolist(),
    }
