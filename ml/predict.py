import sys
import json

"""
Simple heuristic 'ML-like' model for fetal/maternal risk.

Input: JSON on argv[1] with keys:
  maternal_hr, systolic_bp, diastolic_bp,
  fetal_hr, fetal_movement_count, spo2, temperature

Output: JSON to stdout:
  { "risk_level": "...", "risk_score": float, "reason": "..." }
"""

def compute_risk(features):
  score = 0.1  # base low risk
  reasons = []

  mhr = features.get("maternal_hr")
  sbp = features.get("systolic_bp")
  dbp = features.get("diastolic_bp")
  fhr = features.get("fetal_hr")
  fm  = features.get("fetal_movement_count")
  spo2 = features.get("spo2")
  temp = features.get("temperature")

  # --- Maternal HR ---
  if mhr is not None:
    if mhr < 60 or mhr > 120:
      score += 0.20
      reasons.append(f"Abnormal maternal HR ({mhr} bpm)")
    elif mhr < 70 or mhr > 110:
      score += 0.10
      reasons.append(f"Borderline maternal HR ({mhr} bpm)")

  # --- Blood pressure ---
  if sbp is not None and dbp is not None:
    if sbp >= 160 or dbp >= 110:
      score += 0.30
      reasons.append(f"Severe hypertension ({sbp}/{dbp} mmHg)")
    elif sbp >= 140 or dbp >= 90:
      score += 0.15
      reasons.append(f"Elevated blood pressure ({sbp}/{dbp} mmHg)")

  # --- Fetal HR ---
  if fhr is not None:
    if fhr < 110 or fhr > 170:
      score += 0.30
      reasons.append(f"Abnormal fetal HR ({fhr} bpm)")
    elif fhr < 120 or fhr > 160:
      score += 0.15
      reasons.append(f"Borderline fetal HR ({fhr} bpm)")

  # --- Fetal movements ---
  if fm is not None:
    if fm <= 2:
      score += 0.25
      reasons.append(f"Very low fetal movement count ({fm})")
    elif fm <= 5:
      score += 0.10
      reasons.append(f"Reduced fetal movement count ({fm})")

  # --- SpO2 ---
  if spo2 is not None:
    if spo2 < 90:
      score += 0.30
      reasons.append(f"Maternal hypoxia (SpO₂ {spo2}%)")
    elif spo2 < 94:
      score += 0.15
      reasons.append(f"Borderline SpO₂ ({spo2}%)")

  # --- Temperature ---
  if temp is not None:
    if temp >= 38.5:
      score += 0.20
      reasons.append(f"High maternal temperature ({temp}°C)")
    elif temp >= 37.8:
      score += 0.10
      reasons.append(f"Borderline maternal temperature ({temp}°C)")

  # Clamp to [0, 1]
  score = max(0.0, min(1.0, score))

  # Risk levels
  if score < 0.35:
    level = "normal"
  elif score < 0.7:
    level = "warning"
  else:
    level = "critical"

  if not reasons:
    reasons.append("All vital signs within acceptable ranges based on heuristic model.")

  return {
    "risk_level": level,
    "risk_score": float(round(score, 3)),  # nice rounded score
    "reason": "; ".join(reasons)
  }

def main():
  if len(sys.argv) < 2:
    print(json.dumps({
      "risk_level": "normal",
      "risk_score": 0.1,
      "reason": "No input provided to model."
    }))
    return

  try:
    data = json.loads(sys.argv[1])
  except Exception as e:
    print(json.dumps({
      "risk_level": "normal",
      "risk_score": 0.1,
      "reason": f"Invalid JSON input: {str(e)}"
    }))
    return

  result = compute_risk(data)
  print(json.dumps(result))

if __name__ == "__main__":
  main()
