from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import subprocess
import json
import os

app = FastAPI(title="Fetal Risk ML API")

# 👇 predict.py is ONE LEVEL ABOVE ml-api/
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PREDICT_SCRIPT = os.path.abspath(os.path.join(BASE_DIR, "..", "predict.py"))


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
        extra = "allow"   # Rails may send extra keys


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
            timeout=8
        )

        if proc.returncode != 0 or not proc.stdout:
            raise RuntimeError(proc.stderr)

        return json.loads(proc.stdout)

    except Exception as e:
        return {
            "risk_level": "normal",
            "risk_score": 0.1,
            "reason": f"ML fallback: {str(e)}",
            "model_version": "fallback"
        }
