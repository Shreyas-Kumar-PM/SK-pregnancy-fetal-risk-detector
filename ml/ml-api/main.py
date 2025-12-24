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
    # New (demographic model)
    age: Optional[int] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    glucose: Optional[float] = None
    heart_rate: Optional[float] = None

    # Old (fetal vitals model)
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
    """
    Priority:
    1. If demographic fields exist → use them
    2. Else fallback to maternal_hr as heart_rate
    """

    if data.age is not None:
        X = np.array([[
            data.age,
            data.systolic_bp,
            data.diastolic_bp,
            data.glucose,
            data.heart_rate
        ]])
    else:
        # fallback mapping
        X = np.array([[
            30,                        # default age
            120,                       # default systolic
            80,                        # default diastolic
            100,                       # default glucose
            data.maternal_hr or 75
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
