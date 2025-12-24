from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import json
import os

app = FastAPI(title="Fetal Risk ML API")

BASE_DIR = os.path.dirname(__file__)

# IMPORTANT FIX
PREDICT_SCRIPT = os.path.abspath(
    os.path.join(BASE_DIR, "..", "predict.py")
)

class RiskInput(BaseModel):
    maternal_hr: float | None = None
    systolic_bp: float | None = None
    diastolic_bp: float | None = None
    fetal_hr: float | None = None
    fetal_movement_count: int | None = None
    spo2: float | None = None
    temperature: float | None = None
    age: int | None = None
    bs: float | None = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "predict_script_exists": os.path.exists(PREDICT_SCRIPT)
    }


@app.post("/predict")
def predict(data: RiskInput):
    if not os.path.exists(PREDICT_SCRIPT):
        raise HTTPException(status_code=500, detail="predict.py not found")

    payload = data.dict(exclude_none=True)

    try:
        result = subprocess.run(
            ["python3", PREDICT_SCRIPT, json.dumps(payload)],
            capture_output=True,
            text=True,
            timeout=10
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)

    return json.loads(result.stdout)
