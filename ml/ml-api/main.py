from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import numpy as np
import joblib
import os

app = FastAPI(title="Fetal Risk ML API")

# -------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")

rf_model = joblib.load(os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib"))
rf_scaler = joblib.load(os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib"))

logreg_model = joblib.load(os.path.join(MODELS_DIR, "maternal_risk_logreg.joblib"))
logreg_scaler = joblib.load(os.path.join(MODELS_DIR, "maternal_risk_logreg_scaler.joblib"))

# -------------------------------------------------
class RiskInput(BaseModel):
    maternal_hr: Optional[float] = 90
    systolic_bp: Optional[float] = 120
    diastolic_bp: Optional[float] = 80
    fetal_hr: Optional[float] = 140
    fetal_movement_count: Optional[int] = 10
    spo2: Optional[float] = 98
    temperature: Optional[float] = 36.8
    age: Optional[int] = 25
    bs: Optional[float] = 90

    class Config:
        extra = "allow"

@app.get("/health")
def health():
    return {"status": "ok"}

# -------------------------------------------------
# Conservative heuristic (GATING MODEL)
# -------------------------------------------------
def heuristic(f):
    score = 0.12
    reasons = []

    severe_flags = 0

    if f["systolic_bp"] >= 160 or f["diastolic_bp"] >= 110:
        score += 0.25
        severe_flags += 1
        reasons.append("Severe hypertension")

    if f["fetal_hr"] < 110 or f["fetal_hr"] > 170:
        score += 0.25
        severe_flags += 1
        reasons.append("Abnormal fetal heart rate")

    if f["spo2"] < 92:
        score += 0.2
        severe_flags += 1
        reasons.append("Maternal hypoxia")

    if f["temperature"] >= 38.5:
        score += 0.15
        reasons.append("High maternal fever")

    return min(score, 1.0), reasons, severe_flags

# -------------------------------------------------
@app.post("/predict")
def predict(data: RiskInput):
    f = data.dict()

    # Feature engineering
    map_val = (f["systolic_bp"] + 2 * f["diastolic_bp"]) / 3
    pulse_pressure = f["systolic_bp"] - f["diastolic_bp"]

    x_rf = np.array([[f["age"], f["systolic_bp"], f["diastolic_bp"],
                      f["bs"], f["temperature"], f["maternal_hr"],
                      map_val, pulse_pressure]])

    x_lr = np.array([[f["age"], f["systolic_bp"], f["diastolic_bp"],
                      f["bs"], f["temperature"], f["maternal_hr"]]])

    # Heuristic
    h_score, h_reasons, severe_flags = heuristic(f)

    # RF
    rf_probs = rf_model.predict_proba(rf_scaler.transform(x_rf))[0]
    rf_class = int(np.argmax(rf_probs))

    # Logistic
    lr_probs = logreg_model.predict_proba(logreg_scaler.transform(x_lr))[0]
    lr_class = int(np.argmax(lr_probs))

    # -------------------------
    # FINAL DECISION LOGIC
    # -------------------------
    ml_agrees = (rf_class >= 1) + (lr_class >= 1)

    if severe_flags >= 2 and ml_agrees >= 1:
        final_level = "critical"
        final_score = 0.85

    elif h_score >= 0.3 or ml_agrees >= 2:
        final_level = "warning"
        final_score = 0.45 + 0.1 * ml_agrees

    else:
        final_level = "normal"
        final_score = round(0.15 + 0.1 * ml_agrees, 2)

    return {
        "risk_level": final_level,
        "risk_score": round(final_score, 2),
        "reason": "; ".join(h_reasons) if h_reasons else "Vitals within normal limits",

        "model_version": "heuristic-gated RF + logistic",

        "ml_risk_level": rf_class,
        "ml_class_probabilities": rf_probs.tolist(),

        "ml_logreg_risk_level": lr_class,
        "ml_logreg_class_probabilities": lr_probs.tolist(),
    }
