import random
import time
import urllib.parse
import urllib.request
from datetime import datetime


API_URL = "http://127.0.0.1:8000/api/v1/telemetry/"


# Normal operating ranges from the AquaIntel specification
NORMAL_RANGES = {
    "temperature": (45, 70),
    "vibration": (1, 4),
    "pressure": (3, 7),
    "flow_rate": (80, 150),
    "motor_current": (15, 35),
    "voltage": (380, 420),
    "power_kw": (10, 25),
    "rpm": (1400, 1800),
}


def generate_reading(pump_number):
    """Generate synthetic telemetry for one simulated pump."""

    return {
        "pump_id": pump_number,
        "temperature": round(
            random.uniform(*NORMAL_RANGES["temperature"]), 2
        ),
        "vibration": round(
            random.uniform(*NORMAL_RANGES["vibration"]), 2
        ),
        "pressure": round(
            random.uniform(*NORMAL_RANGES["pressure"]), 2
        ),
        "flow_rate": round(
            random.uniform(*NORMAL_RANGES["flow_rate"]), 2
        ),
        "motor_current": round(
            random.uniform(*NORMAL_RANGES["motor_current"]), 2
        ),
        "voltage": round(
            random.uniform(*NORMAL_RANGES["voltage"]), 2
        ),
        "power_kw": round(
            random.uniform(*NORMAL_RANGES["power_kw"]), 2
        ),
        "rpm": round(
            random.uniform(*NORMAL_RANGES["rpm"]), 2
        ),
        "runtime_hours": round(
            random.uniform(1, 100), 2
        ),
    }


def send_reading(reading):
    """Send one telemetry reading to the AquaIntel API."""

    query_string = urllib.parse.urlencode(reading)

    url = f"{API_URL}?{query_string}"

    request = urllib.request.Request(
        url,
        method="POST",
    )

    return urllib.request.urlopen(
        request,
        timeout=10,
    )


def main():
    print("AquaIntel Pump Simulator")
    print("=" * 30)
    print("Starting simulation for 10 pumps...")
    print()

    while True:

        for pump_number in range(1, 11):

            reading = generate_reading(pump_number)

            try:
                response = send_reading(reading)

                if response.status == 200:

                    print(
                        f"[{datetime.now().strftime('%H:%M:%S')}] "
                        f"P-{pump_number:03d} | "
                        f"Temp: {reading['temperature']}°C | "
                        f"Vibration: {reading['vibration']} | "
                        f"Pressure: {reading['pressure']} | "
                        f"Status: OK"
                    )

                else:

                    print(
                        f"P-{pump_number:03d} | "
                        f"API Error: {response.status}"
                    )

                response.close()

            except Exception as error:

                print(
                    f"P-{pump_number:03d} | "
                    f"Connection Error: {error}"
                )

        print()
        print("Waiting 5 seconds before next cycle...")
        print()

        time.sleep(5)


if __name__ == "__main__":
    main()