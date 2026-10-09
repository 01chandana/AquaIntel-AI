def detect_anomaly(telemetry):
    """
    Detect unusual pump telemetry values.

    This lightweight anomaly detector compares each sensor
    value with the normal operating ranges defined in the
    AquaIntel project specification.
    """

    checks = {
        "temperature": (telemetry.temperature, 45, 70),
        "vibration": (telemetry.vibration, 1, 4),
        "pressure": (telemetry.pressure, 3, 7),
        "flow_rate": (telemetry.flow_rate, 80, 150),
        "motor_current": (telemetry.motor_current, 15, 35),
        "voltage": (telemetry.voltage, 380, 420),
        "power_kw": (telemetry.power_kw, 10, 25),
        "rpm": (telemetry.rpm, 1400, 1800),
    }

    abnormal_sensors = []

    for sensor_name, (value, minimum, maximum) in checks.items():
        if value < minimum or value > maximum:
            abnormal_sensors.append(sensor_name)

    total_sensors = len(checks)
    abnormal_count = len(abnormal_sensors)

    anomaly_score = abnormal_count / total_sensors

    if abnormal_count == 0:
        status = "Normal"
    elif abnormal_count <= 2:
        status = "Warning"
    else:
        status = "Anomaly"

    return {
        "status": status,
        "anomaly_score": round(anomaly_score, 4),
        "abnormal_sensors": abnormal_sensors,
    }