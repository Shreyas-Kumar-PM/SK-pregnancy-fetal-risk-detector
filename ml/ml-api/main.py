from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Optional
import subprocess
import json
import os

app = FastAPI(title="Fetal Risk ML API")

BASE_DIR = os.path.dirname(__file__)
PREDICT_SCRIPT = os.path.abspath(
    os.path.join(BASE_DIR, "..", "predict.py")
)

# 🔥 IMPORTANT: everything OPTIONAL
class RiskInput(BaseModel):
    maternal_hr: Optional[float] = Field(default=90)
    systolic_bp: Optional[float] = Field(default=120)
    diastolic_bp: Optional[float] = Field(default=80)
    fetal_hr: Optional[float] = Field(default=140)
    fetal_movement_count: Optional[int] = Field(default=10)
    spo2: Optional[float] = Field(default=98)
    temperature: Optional[float] = Field(default=36.8)
    age: Optional[int] = Field(default=25)
    bs: Optional[float] = Field(default=90)

    class Config:
        extra = "allow"   # ✅ ignore extra fields from Rails

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(data: RiskInput):
    payload = json.dumps(data.dict())

    try:
        proc = subprocess.run(
            ["python3", PREDICT_SCRIPT, payload],
            capture_output=True,
            text=True,
            timeout=10
        )
    except Exception as e:
        return {
            "risk_level": "normal",
            "risk_score": 0.1,
            "reason": f"ML execution error: {str(e)}",
            "model_version": "fallback"
        }

    if proc.returncode != 0 or not proc.stdout:
        return {
            "risk_level": "normal",
            "risk_score": 0.1,
            "reason": "ML process failed – fallback used",
            "model_version": "fallback"
        }

    return json.loads(proc.stdout)
