from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import os

app = FastAPI(title="Fetal Risk ML API")

BASE_DIR = os.path.dirname(__file__)

model = joblib.load(os.path.join(BASE_DIR, "models/maternal_risk_logreg.joblib"))
scaler = joblib.load(os.path.join(BASE_DIR, "models/maternal_risk_logreg_scaler.joblib"))

# ===============================
# Input schema (MATCHES RAILS)
# ===============================
class RiskInput(BaseModel):
    maternal_hr: int
    systolic_bp: float
    diastolic_bp: float
    fetal_hr: int
    fetal_movement_count: int
    spo2: int
    temperature: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(data: RiskInput):
    """
    Internal mapping:
    - age            -> approximated from clinical default (28)
    - glucose        -> approximated from spo2 / temperature
    - heart_rate     -> maternal_hr
    """

    # ⚠️ These mappings MUST match how the model was trained
    age = 28  # default / can be improved later
    glucose = max(70, min(140, data.spo2 + 10))
    heart_rate = data.maternal_hr

    X = np.array([[
        age,
        data.systolic_bp,
        data.diastolic_bp,
        glucose,
        heart_rate
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
        "risk_level": risk_level,
        "reason": "ML risk assessment based on maternal vitals"
    }
