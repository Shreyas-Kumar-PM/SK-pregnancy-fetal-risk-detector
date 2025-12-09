import os
import pandas as pd

BASE_DIR = os.path.dirname(__file__)
RAW_DIR = os.path.join(BASE_DIR, "external_raw")
OUT_DIR = os.path.join(BASE_DIR, "data_multi")

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(OUT_DIR, exist_ok=True)

TARGET_COLS = [
    "Age",
    "SystolicBP",
    "DiastolicBP",
    "BS",
    "BodyTemp",
    "HeartRate",
    "RiskLevel",
]

# Unified risk label mapping
RISK_MAP = {
    "low": "low risk",
    "low risk": "low risk",
    "mild": "low risk",

    "mid": "mid risk",
    "medium": "mid risk",
    "moderate": "mid risk",
    "mid risk": "mid risk",

    "high": "high risk",
    "severe": "high risk",
    "high risk": "high risk",
}


def normalize_risk_label(x):
    if pd.isna(x):
        return None
    s = str(x).strip().lower()
    return RISK_MAP.get(s, None)


def process_uci():
    """
    Maternal Health Risk Data Set from UCI.
    Usually already has the right columns:
      Age, SystolicBP, DiastolicBP, BS, BodyTemp, HeartRate, RiskLevel
    """
    path = os.path.join(RAW_DIR, "maternal_health_uci.csv")
    if not os.path.exists(path):
        print("[WARN] UCI file not found, skipping:", path)
        return

    print("[INFO] Processing UCI Maternal Health Risk dataset ...")
    df = pd.read_csv(path)

    # Try to standardize column names (strip spaces, etc.)
    df.columns = [c.strip().replace(" ", "").replace("_", "") for c in df.columns]

    col_map = {
        "Age": "Age",
        "SystolicBP": "SystolicBP",
        "DiastolicBP": "DiastolicBP",
        "BS": "BS",
        "BodyTemp": "BodyTemp",
        "HeartRate": "HeartRate",
        "RiskLevel": "RiskLevel",
        "Risk": "RiskLevel",
        "HealthRisk": "RiskLevel",
    }

    # Build a new DataFrame with canonical columns
    out = pd.DataFrame()
    for src, tgt in col_map.items():
        if src in df.columns and tgt != "RiskLevel":
            out[tgt] = df[src]

    # Risk/target column
    risk_col = None
    for c in ["RiskLevel", "Risk", "HealthRisk"]:
        if c in df.columns:
            risk_col = c
            break

    if risk_col is None:
        raise ValueError("No risk column found in UCI dataset")

    out["RiskLevel"] = df[risk_col].apply(normalize_risk_label)
    out = out.dropna(subset=TARGET_COLS)

    out = out[TARGET_COLS]  # ensure column order
    out_path = os.path.join(OUT_DIR, "maternal_health_uci_clean.csv")
    out.to_csv(out_path, index=False)
    print("[INFO] Wrote:", out_path, "rows:", len(out))


def process_kaggle_basic():
    """
    Kaggle Maternal Health Risk Data (same as UCI but mirrored).
    """
    path = os.path.join(RAW_DIR, "maternal_health_kaggle.csv")
    if not os.path.exists(path):
        print("[WARN] Kaggle basic file not found, skipping:", path)
        return

    print("[INFO] Processing Kaggle Maternal Health Risk dataset ...")
    df = pd.read_csv(path)
    df.columns = [c.strip().replace(" ", "").replace("_", "") for c in df.columns]

    col_map = {
        "Age": "Age",
        "SystolicBP": "SystolicBP",
        "DiastolicBP": "DiastolicBP",
        "BS": "BS",
        "BodyTemp": "BodyTemp",
        "HeartRate": "HeartRate",
        "RiskLevel": "RiskLevel",
        "Risk": "RiskLevel",
        "HealthRisk": "RiskLevel",
    }

    out = pd.DataFrame()
    for src, tgt in col_map.items():
        if src in df.columns and tgt != "RiskLevel":
            out[tgt] = df[src]

    risk_col = None
    for c in ["RiskLevel", "Risk", "HealthRisk"]:
        if c in df.columns:
            risk_col = c
            break

    if risk_col is None:
        raise ValueError("No risk column found in Kaggle basic dataset")

    out["RiskLevel"] = df[risk_col].apply(normalize_risk_label)
    out = out.dropna(subset=TARGET_COLS)
    out = out[TARGET_COLS]

    out_path = os.path.join(OUT_DIR, "maternal_health_kaggle_clean.csv")
    out.to_csv(out_path, index=False)
    print("[INFO] Wrote:", out_path, "rows:", len(out))


def process_mendeley_assessment():
    """
    Mendeley Maternal Health Risk Assessment Dataset.
    This dataset has more features; we pick the subset that matches our schema:
      Age, SystolicBP, DiastolicBP, BS, BodyTemp, HeartRate, RiskLevel

    If DiastolicBP is missing, we approximate it from SystolicBP.
    """
    path = os.path.join(RAW_DIR, "maternal_health_assessment_mendeley.csv")
    if not os.path.exists(path):
        print("[WARN] Mendeley assessment file not found, skipping:", path)
        return

    print("[INFO] Processing Mendeley Maternal Health Risk Assessment dataset ...")
    df = pd.read_csv(path)

    # Normalize column names for matching
    original_cols = list(df.columns)
    norm_cols = [c.strip().lower().replace(" ", "").replace("_", "") for c in df.columns]
    col_map_norm = dict(zip(norm_cols, original_cols))

    def get_col(*candidates):
        for cand in candidates:
            key = cand.lower().replace(" ", "").replace("_", "")
            if key in col_map_norm:
                return col_map_norm[key]
        return None

    age_col = get_col("Age")
    sbp_col = get_col("SystolicBP", "SystolicBloodPressure", "Systolic BP")
    dbp_col = get_col("DiastolicBP", "DiastolicBloodPressure", "Diastolic BP")
    bs_col = get_col("BS", "BloodSugar", "BloodGlucose")
    temp_col = get_col("BodyTemp", "BodyTemperature", "Body Temp")
    hr_col = get_col("HeartRate", "Pulse", "Heart Rate")
    risk_col = get_col("RiskLevel", "Risk", "HealthRisk", "Risk level")

    # Required cols except DiastolicBP (we can approximate that if missing)
    needed = [age_col, sbp_col, bs_col, temp_col, hr_col, risk_col]
    if any(c is None for c in needed):
        raise ValueError(
            "Missing one or more required columns in Mendeley dataset. "
            f"Resolved columns: {[age_col, sbp_col, dbp_col, bs_col, temp_col, hr_col, risk_col]}"
        )

    out = pd.DataFrame()
    out["Age"] = df[age_col]
    out["SystolicBP"] = df[sbp_col]

    if dbp_col is not None:
        out["DiastolicBP"] = df[dbp_col]
    else:
        # Approximate DiastolicBP from SystolicBP if missing
        print("[WARN] DiastolicBP column not found in Mendeley dataset; "
              "approximating DiastolicBP as SystolicBP - 40.")
        approx_dbp = df[sbp_col] - 40
        # clamp to a reasonable minimum
        approx_dbp = approx_dbp.clip(lower=40)
        out["DiastolicBP"] = approx_dbp

    out["BS"] = df[bs_col]
    out["BodyTemp"] = df[temp_col]
    out["HeartRate"] = df[hr_col]
    out["RiskLevel"] = df[risk_col].apply(normalize_risk_label)

    out = out.dropna(subset=TARGET_COLS)
    out = out[TARGET_COLS]

    out_path = os.path.join(OUT_DIR, "maternal_health_mendeley_clean.csv")
    out.to_csv(out_path, index=False)
    print("[INFO] Wrote:", out_path, "rows:", len(out))

def process_kaggle_mlready():
    """
    Optional: Kaggle ML-ready Maternal Health Risk Assessment dataset.
    We'll try to map to our canonical features if present.
    """
    path = os.path.join(RAW_DIR, "maternal_health_assessment_mlready.csv")
    if not os.path.exists(path):
        print("[WARN] Kaggle ML-ready assessment file not found, skipping:", path)
        return

    print("[INFO] Processing Kaggle ML-ready Maternal Health Risk Assessment dataset ...")
    df = pd.read_csv(path)

    original_cols = list(df.columns)
    norm_cols = [c.strip().lower().replace(" ", "").replace("_", "") for c in df.columns]
    col_map_norm = dict(zip(norm_cols, original_cols))

    def get_col(*candidates):
        for cand in candidates:
            key = cand.lower().replace(" ", "").replace("_", "")
            if key in col_map_norm:
                return col_map_norm[key]
        return None

    age_col = get_col("age")
    sbp_col = get_col("systolicbp", "systolicbloodpressure")
    dbp_col = get_col("diastolicbp", "diastolicbloodpressure")
    bs_col = get_col("bs", "bloodsugar", "bloodglucose")
    temp_col = get_col("bodytemp", "bodytemperature", "temperature")
    hr_col = get_col("heartrate", "pulse")
    risk_col = get_col("risklevel", "risk", "healthrisk")

    needed = [age_col, sbp_col, dbp_col, bs_col, temp_col, hr_col, risk_col]
    if any(c is None for c in needed):
        print("[WARN] Could not resolve all required columns in Kaggle ML-ready dataset.")
        print("[WARN] Skipping this dataset.")
        return

    out = pd.DataFrame()
    out["Age"] = df[age_col]
    out["SystolicBP"] = df[sbp_col]
    out["DiastolicBP"] = df[dbp_col]
    out["BS"] = df[bs_col]
    out["BodyTemp"] = df[temp_col]
    out["HeartRate"] = df[hr_col]
    out["RiskLevel"] = df[risk_col].apply(normalize_risk_label)

    out = out.dropna(subset=TARGET_COLS)
    out = out[TARGET_COLS]

    out_path = os.path.join(OUT_DIR, "maternal_health_mlready_clean.csv")
    out.to_csv(out_path, index=False)
    print("[INFO] Wrote:", out_path, "rows:", len(out))


def main():
    print(f"[INFO] RAW_DIR = {RAW_DIR}")
    print(f"[INFO] OUT_DIR = {OUT_DIR}")

    process_uci()
    process_kaggle_basic()
    process_mendeley_assessment()
    process_kaggle_mlready()

    print("[INFO] Done preparing datasets.")


if __name__ == "__main__":
    main()
