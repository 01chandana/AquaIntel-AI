
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ml_prediction import get_model_info, predict_machine_status

router = APIRouter(
    prefix="/api/v1/ml",
    tags=["Machine Learning"],
)


class SensorPredictionRequest(BaseModel):
    sensor_readings: dict[str, float | None] = Field(
        ...,
        description=(
            "Sensor values using Kaggle names, "
            "such as sensor_00 and sensor_01."
        ),
    )


@router.get("/info")
def model_info():
    """Return metadata for the trained Kaggle model."""
    try:
        return get_model_info()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@router.post("/predict")
def predict_status(request: SensorPredictionRequest):
    """Predict NORMAL, BROKEN, or RECOVERING status."""
    try:
        return predict_machine_status(
            request.sensor_readings
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc