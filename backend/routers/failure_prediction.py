def predict_failure(telemetry, health_score):
    """
    Estimate pump failure risk using telemetry values
    and the calculated health score.

    This is a demonstration prediction model using
    the synthetic telemetry environment of AquaIntel.
    """

    risk_points = 0

    if telemetry.temperature > 70:
        risk_points += 15

    if telemetry.vibration > 4:
        risk_points += 15

    if telemetry.pressure > 7 or telemetry.pressure < 3:
        risk_points += 10

    if telemetry.flow_rate < 80:
        risk_points += 10

    if telemetry.motor_current > 35:
        risk_points += 10

    if telemetry.voltage > 420 or telemetry.voltage < 380:
        risk_points += 10

    if telemetry.power_kw > 25:
        risk_points += 10

    if telemetry.rpm > 1800 or telemetry.rpm < 1400:
        risk_points += 10

    if health_score < 80:
        risk_points += 5

    if health_score < 60:
        risk_points += 10

    if health_score < 40:
        risk_points += 15

    probability = min(risk_points, 100)

    if probability < 30:
        risk_level = "Low"
    elif probability < 60:
        risk_level = "Medium"
    else:
        risk_level = "High"

    return {
        "failure_probability": probability,
        "risk_level": risk_level,
    }