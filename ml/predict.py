import json
import sys
import os
import pickle
import numpy as np

# Model lives in the same folder as this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "fetal_risk_model.pkl")

with open(MODEL_PATH, "rb") as f:
  model = pickle.load(f)

# Read JSON input from argv[1]
raw = sys.argv[1]
data = json.loads(raw)

features = np.array([[
  data["maternal_hr"],
  data["systolic_bp"],
  data["diastolic_bp"],
  data["fetal_hr"],
  data["fetal_movement_count"],
  data["spo2"],
  data["temperature"]
]])

# Use probability of positive/risky class
prob = float(model.predict_proba(features)[0][1])
risk_score = round(prob, 4)

if risk_score > 0.80:
  level = "critical"
  reason = "High ML probability of fetal distress."
elif risk_score > 0.40:
  level = "warning"
  reason = "Elevated risk detected by ML model."
else:
  level = "normal"
  reason = "Risk within safe range."

result = {
  "risk_score": risk_score,
  "risk_level": level,
  "reason": reason
}

print(json.dumps(result))
