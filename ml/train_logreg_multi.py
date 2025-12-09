"""
Train a Logistic Regression baseline model on the same maternal
risk datasets as the RF+PSO model.

Inputs:  All CSVs in ml/data_multi/ with columns:
    Age, SystolicBP, DiastolicBP, BS, BodyTemp, HeartRate, RiskLevel

Outputs (saved in ml/models/):
    maternal_risk_logreg.joblib
    maternal_risk_logreg_scaler.joblib
    maternal_risk_logreg_meta.json
"""

import os
import glob
import json

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score
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

    feature_cols = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate"]
    X = data[feature_cols].values.astype(float)
    y = data["RiskInt"].values

    # Show class distribution (to see imbalance)
    unique, counts = np.unique(y, return_counts=True)
    print("[INFO] Class distribution (label -> count):")
    for cls, cnt in zip(unique, counts):
        print(f"  {cls}: {cnt}")

    print(f"[INFO] Using {X.shape[0]} samples with features {feature_cols}")

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    # Logistic Regression with class balancing so it doesn't collapse to majority class
    clf = LogisticRegression(
        multi_class="multinomial",
        solver="lbfgs",
        max_iter=1000,
        n_jobs=-1,
        class_weight="balanced",  # <-- important change
        C=2.0,                    # <-- a bit less regularization than default
    )

    print("[INFO] Training Logistic Regression...")
    clf.fit(X_train_scaled, y_train)

    y_pred = clf.predict(X_val_scaled)
    f1 = f1_score(y_val, y_pred, average="macro")
    print(f"[INFO] Validation macro F1: {f1:.4f}")
    print("[INFO] Classification report:\n")
    print(classification_report(y_val, y_pred))

    # Save model, scaler, and metadata
    model_path = os.path.join(MODELS_DIR, "maternal_risk_logreg.joblib")
    scaler_path = os.path.join(MODELS_DIR, "maternal_risk_logreg_scaler.joblib")
    meta_path = os.path.join(MODELS_DIR, "maternal_risk_logreg_meta.json")

    joblib.dump(clf, model_path)
    joblib.dump(scaler, scaler_path)

    # Store the label mapping in a consistent direction: name -> int
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

    print(f"[INFO] Saved Logistic Regression model to {model_path}")
    print(f"[INFO] Saved scaler to {scaler_path}")
    print(f"[INFO] Saved meta to {meta_path}")


if __name__ == "__main__":
    main()
