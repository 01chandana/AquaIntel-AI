
from pathlib import Path
import json

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "dataset" / "sensor.csv"
OUTPUT_DIR = BASE_DIR / "backend" / "ml"

def main():
    print("Loading Kaggle dataset...")

    df = pd.read_csv(DATASET_PATH, index_col=0)

    sensor_columns = [
        col for col in df.columns
        if col.startswith("sensor_")
    ]

    for col in sensor_columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    sensors = [
        col for col in sensor_columns
        if df[col].notna().any()
    ]

    df = df[df["machine_status"].isin(
        ["NORMAL", "BROKEN", "RECOVERING"]
    )].copy()

    X = df[sensors]
    y = df["machine_status"]

    print(f"Records: {len(df):,}")
    print(f"Usable sensors: {len(sensors)}")
    print("Status counts:")
    print(y.value_counts().to_string())

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    model = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("classifier", RandomForestClassifier(
            n_estimators=100,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])

    print("\nTraining model...")
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    report_text = classification_report(
        y_test, predictions, zero_division=0
    )
    matrix = confusion_matrix(
        y_test, predictions,
        labels=["NORMAL", "BROKEN", "RECOVERING"]
    )

    print("\nEvaluation report:")
    print(report_text)
    print("\nConfusion matrix (true rows, predicted columns):")
    print(matrix)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, OUTPUT_DIR / "pump_status_model.joblib")

    report = {
        "dataset": "Kaggle Pump Sensor Data",
        "target": "machine_status",
        "sensors_used": sensors,
        "records": len(df),
        "classification_report": classification_report(
            y_test, predictions, output_dict=True,
            zero_division=0
        ),
        "confusion_matrix": matrix.tolist(),
        "note": (
            "This predicts recorded machine status, "
            "not a validated seven-day failure probability. "
            "BROKEN examples are extremely rare."
        ),
    }

    (OUTPUT_DIR / "training_report.json").write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )

    print("\nModel and evaluation report saved in backend/ml.")
    print("Training completed.")

if __name__ == "__main__":
    main()