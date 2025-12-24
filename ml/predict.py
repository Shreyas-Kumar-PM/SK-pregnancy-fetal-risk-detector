import sys
import json
import os

sys.stdout.reconfigure(line_buffering=True)

# ------------------------------
# Heuristic Risk Model (PRIMARY)
# ------------------------------
def compute_risk_heuristic(features):
    score = 0.1
    reasons = []

    mhr = features.get("maternal_hr")
    sbp = features.get("systolic_bp")
    dbp = features.get("diastolic_bp")
    fhr = features.get("fetal_hr")
    fm = features.get("fetal_movement_count")
    spo2 = features.get("spo2")
    temp = features.get("temperature")

    if mhr is not None:
        if mhr < 60 or mhr > 120:
            score += 0.2
            reasons.append(f"Abnormal maternal HR ({mhr})")
        elif mhr < 70 or mhr > 110:
            score += 0.1

    if sbp is not None and dbp is not None:
        if sbp >= 160 or dbp >= 110:
            score += 0.3
            reasons.append(f"Severe hypertension ({sbp}/{dbp})")
        elif sbp >= 140 or dbp >= 90:
            score += 0.15

    if fhr is not None:
        if fhr < 110 or fhr > 170:
            score += 0.3
            reasons.append(f"Abnormal fetal HR ({fhr})")
        elif fhr < 120 or fhr > 160:
            score += 0.15

    if fm is not None:
        if fm <= 2:
            score += 0.25
            reasons.append("Very low fetal movement")
        elif fm <= 5:
            score += 0.1

    if spo2 is not None:
        if spo2 < 90:
            score += 0.3
            reasons.append("Maternal hypoxia")
        elif spo2 < 94:
            score += 0.15

    if temp is not None:
        if temp >= 38.5:
            score += 0.2
            reasons.append("High maternal temperature")
        elif temp >= 37.8:
            score += 0.1

    score = min(1.0, max(0.0, score))

    if score < 0.35:
        level = "normal"
    elif score < 0.7:
        level = "warning"
    else:
        level = "critical"

    if not reasons:
        reasons.append("Vitals within acceptable ranges.")

    return {
        "risk_level": level,
        "risk_score": round(score, 3),
        "reason": "; ".join(reasons),
    }


# ------------------------------
# Main Entrypoint
# ------------------------------
def main():
    try:
        payload = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    except Exception:
        payload = {}

    for k, v in payload.items():
        try:
            payload[k] = float(v)
        except Exception:
            pass

    heuristic = compute_risk_heuristic(payload)

    output = {
        "risk_level": heuristic["risk_level"],
        "risk_score": heuristic["risk_score"],
        "reason": heuristic["reason"],
        "model_version": "heuristic_stable_v1",
        "ml_risk_level": None,
        "ml_class_probabilities": None,
        "ml_logreg_risk_level": None,
        "ml_logreg_class_probabilities": None,
    }

    print(json.dumps(output), flush=True)


if __name__ == "__main__":
    main()
