from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import json
import os

app = FastAPI(title="Fetal Risk ML API")

BASE_DIR = os.path.dirname(__file__)

model = joblib.load(f"{BASE_DIR}/models/maternal_risk_logreg.joblib")
scaler = joblib.load(f"{BASE_DIR}/models/maternal_risk_logreg_scaler.joblib")

class RiskInput(BaseModel):
    age: int
    systolic_bp: float
    diastolic_bp: float
    glucose: float
    heart_rate: float

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(data: RiskInput):
    X = np.array([[  
        data.age,
        data.systolic_bp,
        data.diastolic_bp,
        data.glucose,
        data.heart_rate
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
