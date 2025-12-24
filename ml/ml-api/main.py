from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import numpy as np
import joblib
import os

app = FastAPI(title="Fetal Risk ML API")

# -------------------------------------------------
# Paths
# -------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")

# -------------------------------------------------
# Load models
# -------------------------------------------------
rf_model = joblib.load(os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib"))
rf_scaler = joblib.load(os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib"))

logreg_model = joblib.load(os.path.join(MODELS_DIR, "maternal_risk_logreg.joblib"))
logreg_scaler = joblib.load(os.path.join(MODELS_DIR, "maternal_risk_logreg_scaler.joblib"))

# -------------------------------------------------
# Input schema
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

# -------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# -------------------------------------------------
# Heuristic (controls final label)
# -------------------------------------------------
def heuristic(f):
    score = 0.1
    reasons = []

    if f["systolic_bp"] >= 160 or f["diastolic_bp"] >= 110:
        score += 0.4
        reasons.append("Severe hypertension detected")

    if f["fetal_hr"] < 110 or f["fetal_hr"] > 170:
        score += 0.3
        reasons.append("Abnormal fetal heart rate")

    if f["spo2"] < 94:
        score += 0.2
        reasons.append("Low maternal oxygen saturation")

    score = min(score, 1.0)

    level = "normal"
    if score >= 0.7:
        level = "critical"
    elif score >= 0.35:
        level = "warning"

    return level, score, reasons

# -------------------------------------------------
@app.post("/predict")
def predict(data: RiskInput):
    f = data.dict()

    # -------------------------
    # Engineered features
    # -------------------------
    map_val = (f["systolic_bp"] + 2 * f["diastolic_bp"]) / 3
    pulse_pressure = f["systolic_bp"] - f["diastolic_bp"]

    # -------------------------
    # RF VECTOR (8 features)
    # -------------------------
    x_rf = np.array([[
        f["age"],
        f["systolic_bp"],
        f["diastolic_bp"],
        f["bs"],
        f["temperature"],
        f["maternal_hr"],
        map_val,
        pulse_pressure
    ]])

    # -------------------------
    # LOGREG VECTOR (6 features)
    # -------------------------
    x_lr = np.array([[
        f["age"],
        f["systolic_bp"],
        f["diastolic_bp"],
        f["bs"],
        f["temperature"],
        f["maternal_hr"]
    ]])

    # -------------------------
    # Heuristic
    # -------------------------
    h_level, h_score, h_reasons = heuristic(f)

    # -------------------------
    # RF prediction
    # -------------------------
    x_rf_scaled = rf_scaler.transform(x_rf)
    rf_probs = rf_model.predict_proba(x_rf_scaled)[0]
    rf_class = int(rf_model.predict(x_rf_scaled)[0])

    # -------------------------
    # Logistic Regression prediction
    # -------------------------
    x_lr_scaled = logreg_scaler.transform(x_lr)
    lr_probs = logreg_model.predict_proba(x_lr_scaled)[0]
    lr_class = int(logreg_model.predict(x_lr_scaled)[0])

    return {
        "risk_level": h_level,
        "risk_score": round(h_score, 2),
        "reason": "; ".join(h_reasons) if h_reasons else "Vitals within normal ranges",

        "model_version": "heuristic + RF + logistic",

        "ml_risk_level": rf_class,
        "ml_class_probabilities": rf_probs.tolist(),

        "ml_logreg_risk_level": lr_class,
        "ml_logreg_class_probabilities": lr_probs.tolist(),
    }
