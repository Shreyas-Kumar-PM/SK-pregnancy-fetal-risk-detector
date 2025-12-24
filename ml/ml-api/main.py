from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import numpy as np
import joblib
import os

# -------------------------------------------------
# App MUST be defined first
# -------------------------------------------------
app = FastAPI(title="Fetal Risk ML API")

# -------------------------------------------------
# Paths
# -------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")

# -------------------------------------------------
# Load models (fail fast if missing)
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
# Heuristic gate (authoritative)
# -------------------------------------------------
def heuristic(f):
    score = 0.0
    reasons = []

    if f["systolic_bp"] >= 160 or f["diastolic_bp"] >= 110:
        score += 0.4
        reasons.append("Severe hypertension")

    if f["fetal_hr"] < 110 or f["fetal_hr"] > 170:
        score += 0.3
        reasons.append("Abnormal fetal heart rate")

    if f["spo2"] < 92:
        score += 0.2
        reasons.append("Low maternal oxygen saturation")

    if f["temperature"] >= 38.5:
        score += 0.15
        reasons.append("High maternal temperature")

    return score, reasons

# -------------------------------------------------
@app.post("/predict")
def predict(data: RiskInput):
    f = data.dict()

    # -------------------------
    # HEURISTIC FIRST (HARD GATE)
    # -------------------------
    h_score, h_reasons = heuristic(f)

    if h_score < 0.25:
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
    # Engineered features
    # -------------------------
    map_val = (f["systolic_bp"] + 2 * f["diastolic_bp"]) / 3
    pulse_pressure = f["systolic_bp"] - f["diastolic_bp"]

    # RF (8 features)
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

    # Logistic (6 features)
    x_lr = np.array([[
        f["age"],
        f["systolic_bp"],
        f["diastolic_bp"],
        f["bs"],
        f["temperature"],
        f["maternal_hr"]
    ]])

    rf_probs = rf_model.predict_proba(rf_scaler.transform(x_rf))[0]
    lr_probs = logreg_model.predict_proba(logreg_scaler.transform(x_lr))[0]

    rf_class = int(np.argmax(rf_probs))
    lr_class = int(np.argmax(lr_probs))

    ml_votes = (rf_class >= 1) + (lr_class >= 1)

    # -------------------------
    # Final decision
    # -------------------------
    if h_score >= 0.6 and ml_votes >= 1:
        final_level = "critical"
        final_score = 0.85
    else:
        final_level = "warning"
        final_score = 0.45

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
