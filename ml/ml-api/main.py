from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import subprocess
import json
import os
import sys

app = FastAPI(title="Fetal Risk ML API")

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
        extra = "allow"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(data: RiskInput):
    payload = json.dumps(data.dict())

    try:
        proc = subprocess.run(
            [sys.executable, PREDICT_SCRIPT, payload],  # 🔥 FIX
            capture_output=True,
            text=True,
            timeout=15
        )

        if proc.returncode != 0:
            return {
                "risk_level": "critical",
                "risk_score": 1.0,
                "reason": f"predict.py error: {proc.stderr}",
                "model_version": "execution_error"
            }

        if not proc.stdout:
            raise RuntimeError("Empty output from predict.py")

        return json.loads(proc.stdout)

    except Exception as e:
        return {
            "risk_level": "critical",
            "risk_score": 1.0,
            "reason": f"ML execution failure: {str(e)}",
            "model_version": "fatal_fallback"
        }
