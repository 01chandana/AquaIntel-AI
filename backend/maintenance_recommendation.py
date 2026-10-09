def get_maintenance_recommendation(telemetry, health_score, risk_level):
    """
    Generate a maintenance recommendation based on
    pump telemetry, health score, and failure risk.
    """

    recommendations = []

    if telemetry.temperature > 70:
        recommendations.append(
            "Inspect motor cooling system and check for overheating."
        )

    if telemetry.vibration > 4:
        recommendations.append(
            "Inspect pump bearings, alignment, and mechanical components."
        )

    if telemetry.pressure > 7:
        recommendations.append(
            "Inspect pressure conditions, valves, and discharge line."
        )

    if telemetry.pressure < 3:
        recommendations.append(
            "Inspect suction line, valves, and possible pressure loss."
        )

    if telemetry.flow_rate < 80:
        recommendations.append(
            "Inspect pipes, valves, filters, and pump flow conditions."
        )

    if telemetry.motor_current > 35:
        recommendations.append(
            "Inspect motor load and electrical connections."
        )

    if telemetry.voltage > 420 or telemetry.voltage < 380:
        recommendations.append(
            "Check electrical supply and motor voltage."
        )

    if telemetry.power_kw > 25:
        recommendations.append(
            "Inspect motor load and investigate excessive power consumption."
        )

    if telemetry.rpm > 1800 or telemetry.rpm < 1400:
        recommendations.append(
            "Inspect motor speed and pump operating conditions."
        )

    if risk_level == "High":
        recommendations.append(
            "Schedule maintenance inspection as soon as possible."
        )

    if not recommendations:
        if health_score >= 80:
            recommendations.append(
                "Pump is operating normally. Continue routine monitoring."
            )
        else:
            recommendations.append(
                "Continue monitoring pump condition and schedule inspection."
            )

    return {
        "recommendations": recommendations,
        "priority": risk_level,
    }