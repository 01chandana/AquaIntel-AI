
from pathlib import Path

import joblib
import pandas as pd


# Locate the trained model and its metadata.
BACKEND_DIR = Path(__file__).resolve().parent
MODEL_PATH = BACKEND_DIR / "ml" / "pump_status_model.joblib"
REPORT_PATH = BACKEND_DIR / "ml" / "training_report.json"

_model = None
_model_error = None


def load_model():
    """Load the trained pump-status model once."""
    global _model, _model_error

    if _model is not None:
        return _model

    if _model_error is not None:
        raise RuntimeError(_model_error)

    try:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Trained model not found: {MODEL_PATH}"
            )

        _model = joblib.load(MODEL_PATH)
        return _model

    except Exception as exc:
        _model_error = (
            f"Could not load the AquaIntel model: {exc}"
        )
        raise RuntimeError(_model_error) from exc


def predict_machine_status(sensor_readings: dict):
    """
    Classify pump status from Kaggle sensor features.

    Provide readings using the original sensor names,
    such as sensor_00, sensor_01, and sensor_02.

    This predicts recorded machine status; it does not
    predict a seven-day failure probability.
    """
    model = load_model()

    # Read the exact feature names used during training.
    classifier = model.named_steps["classifier"]
    sensor_names = list(
        model.feature_names_in_
    )

    row = {}

    for name in sensor_names:
        value = sensor_readings.get(name)

        if value is None:
            row[name] = float("nan")
        else:
            try:
                row[name] = float(value)
            except (TypeError, ValueError) as exc:
                raise ValueError(
                    f"{name} must be a number or None"
                ) from exc

    frame = pd.DataFrame([row], columns=sensor_names)

    predicted_status = model.predict(frame)[0]

    probabilities = model.predict_proba(frame)[0]
    class_probabilities = {
        str(label): round(float(probability), 4)
        for label, probability in zip(
            classifier.classes_, probabilities
        )
    }

    return {
        "predicted_machine_status": str(predicted_status),
        "class_probabilities": class_probabilities,
        "model_type": "RandomForestClassifier",
        "target": "machine_status",
        "warning": (
            "Experimental classification only. The model "
            "did not detect the BROKEN examples in its "
            "held-out test set, so do not rely on it for "
            "maintenance or safety decisions."
        ),
    }


def get_model_info():
    """Return information about the saved model."""
    if not REPORT_PATH.exists():
        return {
            "available": False,
            "message": "Training report not found.",
        }

    import json

    report = json.loads(
        REPORT_PATH.read_text(encoding="utf-8")
    )

    return {
        "available": MODEL_PATH.exists(),
        "model_type": "RandomForestClassifier",
        "target": report.get("target"),
        "records": report.get("records"),
        "sensors_used": len(
            report.get("sensors_used", [])
        ),
        "classes": report.get("classes", [
            "NORMAL", "BROKEN", "RECOVERING"
        ]),
        "note": report.get("note"),
    }