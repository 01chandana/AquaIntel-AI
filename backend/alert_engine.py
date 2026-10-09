from models import Alert


# Alert thresholds based on the AquaIntel project specification
THRESHOLDS = {
    "temperature_high": 70.0,
    "vibration_high": 4.0,
    "pressure_high": 7.0,
    "pressure_low": 3.0,
    "flow_low": 80.0,
    "motor_current_high": 35.0,
    "voltage_high": 420.0,
    "voltage_low": 380.0,
    "power_high": 25.0,
    "rpm_high": 1800.0,
    "rpm_low": 1400.0,
}


def check_telemetry_rules(db, telemetry):
    """
    Check telemetry values against predefined alert thresholds.

    Returns a list of alerts created for the telemetry reading.
    """

    alerts = []

    def create_alert(alert_type, severity, message, value, threshold):
        alert = Alert(
            pump_id=telemetry.pump_id,
            alert_type=alert_type,
            severity=severity,
            message=message,
            status="Triggered",
            value=value,
            threshold=threshold,
        )

        db.add(alert)
        alerts.append(alert)

    # Temperature
    if telemetry.temperature > THRESHOLDS["temperature_high"]:
        create_alert(
            "High Temperature",
            "High",
            f"Temperature is too high: {telemetry.temperature}°C",
            telemetry.temperature,
            THRESHOLDS["temperature_high"],
        )

    # Vibration
    if telemetry.vibration > THRESHOLDS["vibration_high"]:
        create_alert(
            "High Vibration",
            "High",
            f"Vibration is too high: {telemetry.vibration} mm/s",
            telemetry.vibration,
            THRESHOLDS["vibration_high"],
        )

    # Pressure high
    if telemetry.pressure > THRESHOLDS["pressure_high"]:
        create_alert(
            "High Pressure",
            "High",
            f"Pressure is too high: {telemetry.pressure} bar",
            telemetry.pressure,
            THRESHOLDS["pressure_high"],
        )

    # Pressure low
    if telemetry.pressure < THRESHOLDS["pressure_low"]:
        create_alert(
            "Low Pressure",
            "Medium",
            f"Pressure is too low: {telemetry.pressure} bar",
            telemetry.pressure,
            THRESHOLDS["pressure_low"],
        )

    # Flow rate low
    if telemetry.flow_rate < THRESHOLDS["flow_low"]:
        create_alert(
            "Low Flow Rate",
            "Medium",
            f"Flow rate is too low: {telemetry.flow_rate} m3/h",
            telemetry.flow_rate,
            THRESHOLDS["flow_low"],
        )

    # Motor current
    if telemetry.motor_current > THRESHOLDS["motor_current_high"]:
        create_alert(
            "High Motor Current",
            "High",
            f"Motor current is too high: {telemetry.motor_current} A",
            telemetry.motor_current,
            THRESHOLDS["motor_current_high"],
        )

    # Voltage high
    if telemetry.voltage > THRESHOLDS["voltage_high"]:
        create_alert(
            "High Voltage",
            "High",
            f"Voltage is too high: {telemetry.voltage} V",
            telemetry.voltage,
            THRESHOLDS["voltage_high"],
        )

    # Voltage low
    if telemetry.voltage < THRESHOLDS["voltage_low"]:
        create_alert(
            "Low Voltage",
            "High",
            f"Voltage is too low: {telemetry.voltage} V",
            telemetry.voltage,
            THRESHOLDS["voltage_low"],
        )

    # Power
    if telemetry.power_kw > THRESHOLDS["power_high"]:
        create_alert(
            "High Power Consumption",
            "Medium",
            f"Power consumption is too high: {telemetry.power_kw} kW",
            telemetry.power_kw,
            THRESHOLDS["power_high"],
        )

    # RPM high
    if telemetry.rpm > THRESHOLDS["rpm_high"]:
        create_alert(
            "High RPM",
            "High",
            f"RPM is too high: {telemetry.rpm}",
            telemetry.rpm,
            THRESHOLDS["rpm_high"],
        )

    # RPM low
    if telemetry.rpm < THRESHOLDS["rpm_low"]:
        create_alert(
            "Low RPM",
            "Medium",
            f"RPM is too low: {telemetry.rpm}",
            telemetry.rpm,
            THRESHOLDS["rpm_low"],
        )

    return alerts