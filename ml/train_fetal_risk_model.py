import json
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score

DATA_PATH = "Maternal Health Risk Data Set.csv"
OUTPUT_MODEL_PATH = "fetal_risk_model.json"

def encode_risk_level(value):
  """
  Convert RiskLevel into binary target:
  1 = high risk, 0 = low/mid risk
  Handles both numeric and string labels.
  """
  if isinstance(value, str):
    v = value.strip().lower()
    if "high" in v:
      return 1
    else:
      return 0
  else:
    # if numeric encoding: 1=low, 2=mid, 3=high
    return 1 if value == 3 else 0

def main():
  df = pd.read_csv(DATA_PATH)

  feature_cols = ["Age", "SystolicBP", "DiastolicBP", "BodyTemp", "HeartRate"]
  df = df.dropna(subset=feature_cols + ["RiskLevel"])

  X = df[feature_cols].copy()
  y = df["RiskLevel"].apply(encode_risk_level)

  X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
  )

  scaler = StandardScaler()
  X_train_scaled = scaler.fit_transform(X_train)
  X_test_scaled = scaler.transform(X_test)

  clf = LogisticRegression()
  clf.fit(X_train_scaled, y_train)

  y_pred = clf.predict(X_test_scaled)
  y_proba = clf.predict_proba(X_test_scaled)[:, 1]

  acc = accuracy_score(y_test, y_pred)
  try:
    auc = roc_auc_score(y_test, y_proba)
  except ValueError:
    auc = None

  print(f"Test accuracy: {acc:.3f}")
  if auc is not None:
    print(f"Test ROC-AUC: {auc:.3f}")

  model_data = {
    "features": feature_cols,
    "coef": clf.coef_[0].tolist(),
    "intercept": float(clf.intercept_[0]),
    "mean": scaler.mean_.tolist(),
    "scale": scaler.scale_.tolist(),
    "performance": {
      "accuracy": acc,
      "roc_auc": auc,
    },
  }

  with open(OUTPUT_MODEL_PATH, "w") as f:
    json.dump(model_data, f, indent=2)

  print(f"Saved model to {OUTPUT_MODEL_PATH}")

if __name__ == "__main__":
  main()
