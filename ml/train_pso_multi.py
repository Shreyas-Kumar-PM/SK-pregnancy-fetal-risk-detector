import os
import glob
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import f1_score
from sklearn.ensemble import RandomForestClassifier

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data_multi")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURE_COLS = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate"]
TARGET_COL = "RiskLevel"


def load_all_datasets():
    csv_files = glob.glob(os.path.join(DATA_DIR, "*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {DATA_DIR}")

    dfs = []
    for path in csv_files:
        df = pd.read_csv(path)

        missing = set(FEATURE_COLS + [TARGET_COL]) - set(df.columns)
        if missing:
            raise ValueError(f"{os.path.basename(path)} is missing columns: {missing}")

        # Keep only required columns
        dfs.append(df[FEATURE_COLS + [TARGET_COL]])

    combined = pd.concat(dfs, ignore_index=True).dropna()

    # Normalise labels to {low, mid, high}
    combined[TARGET_COL] = (
        combined[TARGET_COL]
        .astype(str)
        .str.strip()
        .str.lower()
        .replace(
            {
                "low": "low risk",
                "low_risk": "low risk",
                "mid": "mid risk",
                "mid_risk": "mid risk",
                "medium": "mid risk",
                "high": "high risk",
                "high_risk": "high risk",
            }
        )
    )

    return combined


def encode_labels(y_series: pd.Series):
    mapping = {"low risk": 0, "mid risk": 1, "high risk": 2}
    encoded = y_series.map(mapping)
    if encoded.isnull().any():
        uniques = sorted(y_series.unique())
        raise ValueError(
            f"Unexpected risk labels {uniques}. "
            f"Update mapping in encode_labels()."
        )
    return encoded.values, mapping


def make_model_from_params(params):
    # params = [n_estimators, max_depth, min_samples_split, min_samples_leaf]
    n_estimators = int(params[0])
    max_depth = int(params[1])
    min_samples_split = int(params[2])
    min_samples_leaf = int(params[3])

    n_estimators = max(50, min(n_estimators, 400))
    max_depth = max(2, min(max_depth, 20))
    min_samples_split = max(2, min(min_samples_split, 20))
    min_samples_leaf = max(1, min(min_samples_leaf, 20))

    return RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=min_samples_split,
        min_samples_leaf=min_samples_leaf,
        random_state=42,
        class_weight="balanced_subsample",
        n_jobs=-1,
    )


def pso_objective(params, X, y, n_splits=5):
    """
    PSO objective: we want to MAXIMIZE macro F1, but PSO MINIMIZES,
    so we return -macro_f1.
    params: array of shape (n_particles, 4)
    """
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    scores = []

    for particle in params:
        f1_scores = []
        model = make_model_from_params(particle)
        for train_idx, val_idx in skf.split(X, y):
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]
            model.fit(X_train, y_train)
            y_pred = model.predict(X_val)
            f1_scores.append(f1_score(y_val, y_pred, average="macro"))
        scores.append(-np.mean(f1_scores))  # negative because PSO minimizes
    return np.array(scores)


def run_pso(X, y, n_particles=12, n_iters=20):
    """
    Simple PSO in 4D hyperparameter space.
    """
    dim = 4
    lb = np.array([50, 2, 2, 1], dtype=float)
    ub = np.array([400, 20, 20, 20], dtype=float)

    rng = np.random.default_rng(42)
    pos = lb + (ub - lb) * rng.random((n_particles, dim))
    vel = rng.normal(scale=5.0, size=(n_particles, dim))

    pbest_pos = pos.copy()
    pbest_val = pso_objective(pos, X, y)
    gbest_idx = np.argmin(pbest_val)
    gbest_pos = pbest_pos[gbest_idx].copy()
    gbest_val = pbest_val[gbest_idx]

    c1 = 1.5
    c2 = 1.5
    w_max, w_min = 0.9, 0.4

    for it in range(n_iters):
        w = w_max - (w_max - w_min) * (it / max(1, n_iters - 1))
        r1 = rng.random((n_particles, dim))
        r2 = rng.random((n_particles, dim))

        vel = (
            w * vel
            + c1 * r1 * (pbest_pos - pos)
            + c2 * r2 * (gbest_pos - pos)
        )
        pos = pos + vel
        pos = np.clip(pos, lb, ub)

        obj_vals = pso_objective(pos, X, y)

        improved = obj_vals < pbest_val
        pbest_pos[improved] = pos[improved]
        pbest_val[improved] = obj_vals[improved]

        gbest_idx = np.argmin(pbest_val)
        gbest_pos = pbest_pos[gbest_idx].copy()
        gbest_val = pbest_val[gbest_idx]

        print(f"Iteration {it+1}/{n_iters} - best macro F1: {-gbest_val:.4f}")

    return gbest_pos, -gbest_val


def main():
    df = load_all_datasets()
    X_raw = df[FEATURE_COLS].values
    y_raw, label_mapping = encode_labels(df[TARGET_COL])

    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    print(f"Loaded {len(df)} samples from {DATA_DIR}")
    print("Running PSO hyperparameter search over RF model...")
    best_params, best_score = run_pso(X, y_raw, n_particles=14, n_iters=25)
    print("Best hyperparameters (float vector):", best_params)
    print(f"Best cross-validated macro F1: {best_score:.4f}")

    best_model = make_model_from_params(best_params)
    best_model.fit(X, y_raw)

    model_path = os.path.join(MODELS_DIR, "maternal_risk_rf_pso_multi.joblib")
    scaler_path = os.path.join(MODELS_DIR, "maternal_risk_scaler_multi.joblib")
    meta_path = os.path.join(MODELS_DIR, "maternal_risk_meta_multi.json")

    joblib.dump(best_model, model_path)
    joblib.dump(scaler, scaler_path)
    with open(meta_path, "w") as f:
        json.dump(
            {
                "features": FEATURE_COLS,
                "label_mapping": label_mapping,
                "best_params": best_params.tolist(),
                "best_macro_f1": best_score,
                "n_samples": int(len(df)),
            },
            f,
            indent=2,
        )

    print(f"Saved NEW model to {model_path}")
    print(f"Saved NEW scaler to {scaler_path}")
    print(f"Saved NEW metadata to {meta_path}")


if __name__ == "__main__":
    main()
