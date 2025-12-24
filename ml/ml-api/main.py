from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import json
import os

app = FastAPI(title="Fetal Risk ML API")

BASE_DIR = os.path.dirname(__file__)
PREDICT_SCRIPT = os.path.abspath(os.path.join(BASE_DIR, "..", "predict.py"))

class RiskInput(BaseModel):
    maternal_hr: float | None = None
    systolic_bp: float | None = None
    diastolic_bp: float | None = None
    fetal_hr: float | None = None
    fetal_movement_count: float | None = None
    spo2: float | None = None
    temperature: float | None = None
    age: float | None = None
    bs: float | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(data: RiskInput):
    if not os.path.exists(PREDICT_SCRIPT):
        raise HTTPException(status_code=500, detail="predict.py not found")

    payload = data.dict()
    cmd = ["python3", PREDICT_SCRIPT, json.dumps(payload)]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            raise Exception(result.stderr)

        return json.loads(result.stdout)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
