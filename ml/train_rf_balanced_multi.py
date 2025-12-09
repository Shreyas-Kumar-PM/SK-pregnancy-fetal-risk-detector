"""
Train a balanced RandomForest model on maternal risk datasets.

- Uses all CSVs in ml/data_multi/ with columns:
    Age, SystolicBP, DiastolicBP, BS, BodyTemp, HeartRate, RiskLevel
- Balances classes using SMOTE.
- Adds simple engineered features: MAP, PulsePressure.
- Saves model + scaler + metadata to ml/models/ with the SAME filenames that
  predict.py already expects:
    maternal_risk_rf_pso_multi.joblib
    maternal_risk_scaler_multi.joblib
    maternal_risk_meta_multi.json
"""

import os
import glob
import json

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, f1_score
from imblearn.over_sampling import SMOTE
import joblib

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data_multi")
MODELS_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(MODELS_DIR, exist_ok=True)

EXPECTED_COLS = [
    "Age",
    "SystolicBP",
    "DiastolicBP",
    "BS",
    "BodyTemp",
    "HeartRate",
    "RiskLevel",
]


def load_all_data():
    csv_files = glob.glob(os.path.join(DATA_DIR, "*.csv"))
    if not csv_files:
        raise FileNotFoundError(
            f"No CSV files found in {DATA_DIR}. Put your datasets there."
        )

    dfs = []
    for path in csv_files:
        df = pd.read_csv(path)
        missing = set(EXPECTED_COLS) - set(df.columns)
        if missing:
            print(
                f"[WARN] {os.path.basename(path)} is missing columns: {missing}. Skipping."
            )
            continue
        dfs.append(df[EXPECTED_COLS].copy())

    if not dfs:
        raise ValueError("No valid CSVs with required columns were found.")

    data = pd.concat(dfs, ignore_index=True)
    return data


def main():
    print(f"[INFO] Loading data from {DATA_DIR} ...")
    data = load_all_data()
    print(f"[INFO] Combined dataset shape: {data.shape}")

    # Drop rows with any missing values in features/label
    data = data.dropna(subset=EXPECTED_COLS)
    print(f"[INFO] After dropping NaNs: {data.shape}")

    # Map RiskLevel to integers
    risk_mapping = {
        "low risk": 0,
        "mid risk": 1,
        "high risk": 2,
        "low": 0,
        "medium": 1,
        "mid": 1,
        "normal": 0,
        "high": 2,
    }

    def map_risk(x):
        x = str(x).strip().lower()
        return risk_mapping.get(x, None)

    data["RiskInt"] = data["RiskLevel"].apply(map_risk)
    data = data.dropna(subset=["RiskInt"])
    data["RiskInt"] = data["RiskInt"].astype(int)

    # Base feature columns
    base_features = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate"]

    # Simple feature engineering
    data["MAP"] = (data["SystolicBP"] + 2 * data["DiastolicBP"]) / 3.0
    data["PulsePressure"] = data["SystolicBP"] - data["DiastolicBP"]

    feature_cols = base_features + ["MAP", "PulsePressure"]

    X = data[feature_cols].values.astype(float)
    y = data["RiskInt"].values

    # Show class distribution before balancing
    unique, counts = np.unique(y, return_counts=True)
    print("[INFO] Class distribution BEFORE SMOTE (label -> count):")
    for cls, cnt in zip(unique, counts):
        print(f"  {cls}: {cnt}")

    # Train/val split
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Apply SMOTE on training data only
    print("[INFO] Applying SMOTE to balance classes on training set...")
    smote = SMOTE(random_state=42)
    X_train_bal, y_train_bal = smote.fit_resample(X_train, y_train)

    unique_bal, counts_bal = np.unique(y_train_bal, return_counts=True)
    print("[INFO] Class distribution AFTER SMOTE (train set, label -> count):")
    for cls, cnt in zip(unique_bal, counts_bal):
        print(f"  {cls}: {cnt}")

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_bal)
    X_val_scaled = scaler.transform(X_val)

    # Reasonable RF config (you can tune further if you want)
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )

    print("[INFO] Training RandomForest...")
    rf.fit(X_train_scaled, y_train_bal)

    # Validation performance
    y_pred = rf.predict(X_val_scaled)
    f1 = f1_score(y_val, y_pred, average="macro")
    print(f"[INFO] Validation macro F1: {f1:.4f}")
    print("[INFO] Classification report:\n")
    print(classification_report(y_val, y_pred))

    # Save model, scaler, and metadata using the SAME filenames predict.py expects
    model_path = os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib")
    scaler_path = os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib")
    meta_path = os.path.join(MODELS_DIR, "maternal_risk_meta_multi.json")

    joblib.dump(rf, model_path)
    joblib.dump(scaler, scaler_path)

    # Label mapping: name -> int (so predict.py can invert it)
    label_mapping = {
        "low risk": 0,
        "mid risk": 1,
        "high risk": 2,
    }

    meta = {
        "features": feature_cols,
        "label_mapping": label_mapping,
    }

    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"[INFO] Saved RandomForest model to {model_path}")
    print(f"[INFO] Saved scaler to {scaler_path}")
    print(f"[INFO] Saved meta to {meta_path}")


if __name__ == "__main__":
    main()
