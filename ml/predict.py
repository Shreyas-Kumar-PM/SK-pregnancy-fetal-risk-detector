import json
import sys
import pickle
import numpy as np

MODEL_PATH = "ml/fetal_risk_model.pkl"

# Load the model
with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

# Read JSON input
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

# Use probability output (IMPORTANT)
prob = float(model.predict_proba(features)[0][1])

risk_score = round(prob, 4)

# Convert probability → risk level
if risk_score > 0.80:
    level = "critical"
    reason = "High ML probability of fetal distress."
elif risk_score > 0.40:
    level = "warning"
    reason = "Possible early risk detected."
else:
    level = "normal"
    reason = "Parameters within expected safe range."

result = {
    "risk_score": risk_score,
    "risk_level": level,
    "reason": reason
}

print(json.dumps(result))
