from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import json
import os

app = FastAPI(title="Fetal Risk ML API (Hybrid)")

BASE_DIR = os.path.dirname(__file__)
PREDICT_SCRIPT = os.path.join(BASE_DIR, "predict.py")

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
    return {"status": "ok", "model": "hybrid-heuristic-rf-logreg"}


@app.post("/predict")
def predict(data: RiskInput):
    if not os.path.exists(PREDICT_SCRIPT):
        raise HTTPException(status_code=500, detail="predict.py not found")

    try:
        payload = json.dumps(data.dict())
        result = subprocess.run(
            ["python", PREDICT_SCRIPT],
            input=payload,
            text=True,
            capture_output=True,
            timeout=10
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"ML error: {result.stderr}"
        )

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid ML output: {result.stdout}"
        )
