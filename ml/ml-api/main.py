from fastapi import FastAPI
from pydantic import BaseModel
import subprocess
import json
import os

app = FastAPI(title="Fetal Risk ML API")

BASE_DIR = os.path.dirname(__file__)
PREDICT_SCRIPT = os.path.abspath(os.path.join(BASE_DIR, "..", "predict.py"))

class RiskInput(BaseModel):
    maternal_hr: float
    systolic_bp: float
    diastolic_bp: float
    fetal_hr: float
    fetal_movement_count: int
    spo2: float
    temperature: float
    age: int
    bs: float

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(data: RiskInput):
    payload = json.dumps(data.dict())

    proc = subprocess.run(
        ["python3", PREDICT_SCRIPT, payload],
        capture_output=True,
        text=True
    )

    if proc.returncode != 0:
        return {
            "risk_level": "normal",
            "risk_score": 0.1,
            "reason": "ML engine error – fallback"
        }

    return json.loads(proc.stdout)
