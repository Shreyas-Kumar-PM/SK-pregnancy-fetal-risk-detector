from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import subprocess
import json
import os
import sys

app = FastAPI(title="Fetal Risk ML Service")

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
PREDICT_SCRIPT = os.path.join(BASE_DIR, "predict.py")


class RiskInput(BaseModel):
    maternal_hr: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    fetal_hr: Optional[float] = None
    fetal_movement_count: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    age: Optional[float] = None
    bs: Optional[float] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(data: RiskInput):
    # Absolute safety fallback
    fallback = {
        "risk_level": "normal",
        "risk_score": 0.1,
        "reason": "ML engine unavailable, safe fallback used.",
        "model_version": "fallback",
        "ml_risk_level": None,
        "ml_class_probabilities": None,
        "ml_logreg_risk_level": None,
        "ml_logreg_class_probabilities": None,
    }

    if not os.path.exists(PREDICT_SCRIPT):
        return fallback

    payload = data.dict(exclude_none=True)

    try:
        result = subprocess.run(
            [sys.executable, PREDICT_SCRIPT, json.dumps(payload)],
            capture_output=True,
            text=True,
            timeout=15,
        )
    except Exception as e:
        fallback["reason"] = f"ML execution failed: {str(e)}"
        return fallback

    if result.returncode != 0 or not result.stdout:
        fallback["reason"] = "ML model execution failed, fallback used."
        fallback["debug"] = result.stderr[:200]
        return fallback

    try:
        return json.loads(result.stdout)
    except Exception:
        fallback["reason"] = "Invalid ML output format."
        return fallback
