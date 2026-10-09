
import type { ReactNode } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type PumpHealth = {
  pump: Record<string, unknown>;
  healthScore: number | null;
  healthStatus: string;
  healthError: boolean;
};

type AlertItem = Record<string, unknown>;
type TelemetryItem = Record<string, unknown>;

type Props = {
  pumps: PumpHealth[];
  alerts: AlertItem[];
  telemetry: TelemetryItem[];
};

function getValue(
  row: Record<string, unknown>,
  keys: string[],
  fallback: unknown = undefined
): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }

  return fallback;
}

function numericValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e5eaf2',
        borderRadius: 15,
        padding: 20,
        minWidth: 0,
        boxShadow: '0 4px 18px rgba(15, 23, 42, 0.035)',
      }}
    >
      <h2
        style={{
          fontSize: 18,
          margin: '0 0 6px',
          color: '#172033',
        }}
      >
        {title}
      </h2>

      <p
        style={{
          fontSize: 12,
          color: '#64748b',
          margin: '0 0 20px',
        }}
      >
        {description}
      </p>

      {children}
    </section>
  );
}

export default function DashboardCharts({
  pumps,
  alerts,
  telemetry,
}: Props) {
  const healthData = pumps.map(({ pump, healthScore }) => ({
    name: String(getValue(pump, ['pump_id', 'pump_code', 'id'], 'Pump')),
    health: healthScore ?? 0,
    unavailable: healthScore === null,
  }));

  const latestTelemetry = [...telemetry]
    .sort((a, b) => {
      const aTime = new Date(String(a.timestamp ?? '')).getTime() || 0;
      const bTime = new Date(String(b.timestamp ?? '')).getTime() || 0;

      return bTime - aTime;
    })
    .slice(0, 12)
    .reverse();

  const sensorData = latestTelemetry.map((item, index) => ({
    reading: `R${index + 1}`,
    temperature: numericValue(item.temperature),
    vibration: numericValue(item.vibration),
    pressure: numericValue(item.pressure),
    flow: numericValue(item.flow_rate),
  }));

  const alertCounts = [
    {
      name: 'Unresolved',
      count: alerts.filter((alert) => {
        const status = String(
          getValue(alert, ['status', 'state'], 'Triggered')
        ).toLowerCase();

        return !['resolved', 'closed'].includes(status);
      }).length,
    },
    {
      name: 'Resolved',
      count: alerts.filter((alert) => {
        const status = String(
          getValue(alert, ['status', 'state'], '')
        ).toLowerCase();

        return ['resolved', 'closed'].includes(status);
      }).length,
    },
  ];

  const COLORS = ['#dc2626', '#16a34a'];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
        gap: 20,
        marginBottom: 24,
      }}
    >
      <ChartCard
        title="Pump Health Comparison"
        description="Health scores returned by the backend API, from 0 to 100."
      >
        {healthData.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 13 }}>
            No pump health data available yet.
          </p>
        ) : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={healthData}
                margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar
                  dataKey="health"
                  name="Health score"
                  fill="#2563eb"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {healthData.some((item) => item.unavailable) && (
          <p style={{ color: '#b45309', fontSize: 12 }}>
            Unavailable scores are shown as zero in this chart. Check the
            health table for details.
          </p>
        )}
      </ChartCard>

      <ChartCard
        title="Recent Sensor Readings"
        description="Latest 12 telemetry records. Sensor units differ, so compare values with care."
      >
        {sensorData.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 13 }}>
            No telemetry readings available yet.
          </p>
        ) : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sensorData}
                margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="reading" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature"
                  stroke="#ea580c"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="vibration"
                  name="Vibration"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pressure"
                  name="Pressure"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="flow"
                  name="Flow rate"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Alert Summary"
        description="Resolved versus unresolved alerts returned by the API."
      >
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={alertCounts}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="48%"
                outerRadius={90}
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {alertCounts.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}