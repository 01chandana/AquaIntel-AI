from sklearn.ensemble import IsolationForest


def detect_anomaly(telemetry):
    """
    Detect whether a telemetry reading is unusual.

    Uses Isolation Forest on the pump sensor values.
    """

    features = [[
        telemetry.temperature,
        telemetry.vibration,
        telemetry.pressure,
        telemetry.flow_rate,
        telemetry.motor_current,
        telemetry.voltage,
        telemetry.power_kw,
        telemetry.rpm,
    ]]

    model = IsolationForest(
        contamination=0.1,
        random_state=42
    )

    model.fit(features)

    prediction = model.predict(features)
    score = model.decision_function(features)[0]

    if prediction[0] == -1:
        status = "Anomaly"
    else:
        status = "Normal"

    return {
        "status": status,
        "anomaly_score": round(float(score), 4),
    }