def calculate_health_score(telemetry):
    """
    Calculate a pump health score from 0 to 100.

    A score of 100 means the sensor values are
    within the normal operating ranges.
    """

    score = 100.0

    # Temperature
    if telemetry.temperature > 70:
        score -= 15

    # Vibration
    if telemetry.vibration > 4:
        score -= 15

    # Pressure
    if telemetry.pressure > 7 or telemetry.pressure < 3:
        score -= 10

    # Flow rate
    if telemetry.flow_rate < 80:
        score -= 10

    # Motor current
    if telemetry.motor_current > 35:
        score -= 10

    # Voltage
    if telemetry.voltage > 420 or telemetry.voltage < 380:
        score -= 10

    # Power consumption
    if telemetry.power_kw > 25:
        score -= 10

    # RPM
    if telemetry.rpm > 1800 or telemetry.rpm < 1400:
        score -= 10

    # Make sure score never goes below zero
    score = max(score, 0)

    # Health status
    if score >= 80:
        status = "Healthy"
    elif score >= 60:
        status = "Warning"
    elif score >= 40:
        status = "Critical"
    else:
        status = "Severe"

    return {
        "health_score": round(score, 2),
        "status": status,
    }