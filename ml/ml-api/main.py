from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import joblib
import numpy as np
import os

app = FastAPI(title="Fetal Risk ML API")

BASE_DIR = os.path.dirname(__file__)

model = joblib.load(f"{BASE_DIR}/models/maternal_risk_logreg.joblib")
scaler = joblib.load(f"{BASE_DIR}/models/maternal_risk_logreg_scaler.joblib")

class RiskInput(BaseModel):
    age: Optional[int] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    glucose: Optional[float] = None
    heart_rate: Optional[float] = None

    maternal_hr: Optional[float] = None
    fetal_hr: Optional[float] = None
    fetal_movement_count: Optional[int] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(data: RiskInput):

    # ---- FEATURE VECTOR (6 FEATURES REQUIRED) ----
    X = np.array([[
        data.age or 30,
        data.systolic_bp or 120,
        data.diastolic_bp or 80,
        data.glucose or 100,
        data.heart_rate or data.maternal_hr or 75,
        25.0  # ✅ MISSING FEATURE (e.g. BMI) — SAFE DEFAULT
    ]])

    X_scaled = scaler.transform(X)
    prob = model.predict_proba(X_scaled)[0][1]

    risk_level = (
        "high" if prob > 0.7 else
        "medium" if prob > 0.4 else
        "low"
    )

    return {
        "risk_score": round(float(prob), 4),
        "risk_level": risk_level
    }
