
import { useCallback, useEffect, useState } from 'react';
import api from './api/client';
import DashboardCharts from './DashboardCharts';
import './App.css';

type Row = Record<string, unknown>;

type PumpWithHealth = {
  pump: Row;
  healthScore: number | null;
  healthStatus: string;
  healthError: boolean;
};

function getRows(data: unknown): Row[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is Row =>
        typeof item === 'object' && item !== null && !Array.isArray(item)
    );
  }

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;

    for (const key of ['items', 'data', 'results', 'pumps', 'alerts', 'telemetry']) {
      if (Array.isArray(obj[key])) {
        return getRows(obj[key]);
      }
    }
  }

  return [];
}

function getValue(
  row: Row,
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

function show(value: unknown, fallback = '—'): string {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function getPumpId(pump: Row): string | number | null {
  const value = getValue(pump, ['id', 'pump_id', 'pumpId']);

  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  return null;
}

function getHealthColor(score: number | null): string {
  if (score === null) return '#64748b';
  if (score >= 80) return '#15803d';
  if (score >= 60) return '#a16207';
  if (score >= 40) return '#c2410c';
  return '#b91c1c';
}

function getStatusColor(status: string): string {
  const normalized = status.toLowerCase();

  if (['resolved', 'healthy', 'active', 'acknowledged'].includes(normalized)) {
    return '#15803d';
  }

  if (['warning', 'maintenance', 'pending'].includes(normalized)) {
    return '#a16207';
  }

  if (
    ['critical', 'severe', 'triggered', 'unresolved', 'inactive'].includes(
      normalized
    )
  ) {
    return '#b91c1c';
  }

  return '#475569';
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return show(value);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return show(value);
  }

  return date.toLocaleString();
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <section style={styles.statCard}>
      <p style={styles.statTitle}>{title}</p>
      <div style={styles.statValue}>{value}</div>
      <p style={styles.statSubtitle}>{subtitle}</p>
    </section>
  );
}

function StatusLabel({ value }: { value: string }) {
  return (
    <span
      style={{
        ...styles.statusLabel,
        color: getStatusColor(value),
        background: `${getStatusColor(value)}14`,
      }}
    >
      {value}
    </span>
  );
}

function App() {
  const [pumps, setPumps] = useState<PumpWithHealth[]>([]);
  const [alerts, setAlerts] = useState<Row[]>([]);
  const [telemetry, setTelemetry] = useState<Row[]>([]);
  const [overview, setOverview] = useState<Row>({});
  const [model, setModel] = useState<Row>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [alertActionLoading, setAlertActionLoading] = useState<string | null>(null);
  const [alertActionMessage, setAlertActionMessage] = useState('');
  const [alertActionError, setAlertActionError] = useState('');
  const [pumpSearch, setPumpSearch] = useState('');
  const [pumpHealthFilter, setPumpHealthFilter] = useState('all');
  const [selectedPump, setSelectedPump] = useState<PumpWithHealth | null>(null);
  const [pumpPrediction, setPumpPrediction] = useState<Row | null>(null);
  const [pumpDetailLoading, setPumpDetailLoading] = useState(false);
  const [pumpDetailError, setPumpDetailError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const results = await Promise.allSettled([
        api.get('/api/v1/pumps/'),
        api.get('/api/v1/alerts/'),
        api.get('/api/v1/analytics/overview'),
        api.get('/api/v1/ml/info'),
        api.get('/api/v1/telemetry/'),
      ]);

      const pumpsResult = results[0];
      const alertsResult = results[1];
      const overviewResult = results[2];
      const modelResult = results[3];
      const telemetryResult = results[4];

      let pumpRows: Row[] = [];

      if (pumpsResult.status === 'fulfilled') {
        pumpRows = getRows(pumpsResult.value.data);
      } else {
        setError(
          'Could not load pumps. Check that the backend is running at http://127.0.0.1:8000.'
        );
      }

      if (alertsResult.status === 'fulfilled') {
        setAlerts(getRows(alertsResult.value.data));
      } else {
        setAlerts([]);
      }

      if (overviewResult.status === 'fulfilled') {
        const data = overviewResult.value.data;
        setOverview(
          typeof data === 'object' && data !== null
            ? (data as Row)
            : {}
        );
      } else {
        setOverview({});
      }

      if (modelResult.status === 'fulfilled') {
        const data = modelResult.value.data;
        setModel(
          typeof data === 'object' && data !== null
            ? (data as Row)
            : {}
        );
      } else {
        setModel({});
      }

      if (telemetryResult.status === 'fulfilled') {
        setTelemetry(getRows(telemetryResult.value.data));
      } else {
        setTelemetry([]);
      }

      const healthResults = await Promise.all(
        pumpRows.map(async (pump): Promise<PumpWithHealth> => {
          const pumpId = getPumpId(pump);

          if (pumpId === null) {
            return {
              pump,
              healthScore: null,
              healthStatus: 'Health unavailable',
              healthError: true,
            };
          }

          try {
            const response = await api.get(
              `/api/v1/pumps/${encodeURIComponent(String(pumpId))}/health`
            );

            const healthData = response.data as Row;
            const rawScore = getValue(healthData, [
              'health_score',
              'healthScore',
            ]);

            let score: number | null = null;

            if (typeof rawScore === 'number') {
              score = rawScore;
            } else if (
              typeof rawScore === 'string' &&
              rawScore.trim() !== ''
            ) {
              score = Number(rawScore);
            }

            const validScore =
              score !== null && Number.isFinite(score) ? score : null;

            return {
              pump,
              healthScore: validScore,
              healthStatus: show(
                getValue(healthData, ['status', 'health_status']),
                'Unknown'
              ),
              healthError: validScore === null,
            };
          } catch {
            return {
              pump,
              healthScore: null,
              healthStatus: 'Health unavailable',
              healthError: true,
            };
          }
        })
      );

      setPumps(healthResults);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError('Something went wrong while loading the dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const openPumpDetails = useCallback(async (item: PumpWithHealth) => {
    setSelectedPump(item);
    setPumpPrediction(null);
    setPumpDetailError('');
    setPumpDetailLoading(true);
    const pumpId = getPumpId(item.pump);

    if (pumpId === null) {
      setPumpDetailError('This pump does not have a valid ID for prediction lookup.');
      setPumpDetailLoading(false);
      return;
    }

    try {
      const response = await api.get(
        `/api/v1/pumps/${encodeURIComponent(String(pumpId))}/prediction`
      );
      setPumpPrediction(
        typeof response.data === 'object' && response.data !== null
          ? (response.data as Row)
          : { result: response.data }
      );
    } catch (error: unknown) {
      const responseData = (error as { response?: { data?: { detail?: unknown } } })?.response?.data;
      const detail = responseData?.detail;
      setPumpDetailError(
        typeof detail === 'string'
          ? detail
          : 'Prediction details are unavailable. You can still review the pump information below.'
      );
    } finally {
      setPumpDetailLoading(false);
    }
  }, []);

  const handleAlertAction = useCallback(
    async (alert: Row, action: 'acknowledge' | 'resolve') => {
      const alertId = getValue(alert, ['id', 'alert_id', 'alertId']);

      if (typeof alertId !== 'string' && typeof alertId !== 'number') {
        setAlertActionError('This alert does not contain a valid alert ID.');
        setAlertActionMessage('');
        return;
      }

      const id = String(alertId);
      setAlertActionLoading(`${id}:${action}`);
      setAlertActionError('');
      setAlertActionMessage('');

      try {
        await api.post(
          `/api/v1/alerts/${encodeURIComponent(id)}/${action}`
        );

        setAlertActionMessage(
          action === 'acknowledge'
            ? `Alert ${id} acknowledged successfully.`
            : `Alert ${id} resolved successfully.`
        );

        await loadDashboard();
      } catch (error: unknown) {
        const responseData = (
          error as { response?: { data?: { detail?: unknown } } }
        )?.response?.data;
        const detail = responseData?.detail;

        setAlertActionError(
          typeof detail === 'string'
            ? detail
            : `Could not ${action} alert ${id}. Check the backend terminal and try again.`
        );
      } finally {
        setAlertActionLoading(null);
      }
    },
    [loadDashboard]
  );

  const healthyCount = pumps.filter(
    (item) => item.healthScore !== null && item.healthScore >= 80
  ).length;

  const warningCount = pumps.filter(
    (item) =>
      item.healthScore !== null &&
      item.healthScore >= 60 &&
      item.healthScore < 80
  ).length;

  const criticalCount = pumps.filter(
    (item) => item.healthScore !== null && item.healthScore < 60
  ).length;

  const unresolvedAlerts = alerts.filter((alert) => {
    const status = show(
      getValue(alert, ['status', 'state']),
      'Triggered'
    ).toLowerCase();

    return !['resolved', 'closed'].includes(status);
  }).length;

  const recentAlerts = [...alerts]
    .sort((a, b) => {
      const aTime = new Date(
        String(getValue(a, ['timestamp', 'created_at', 'createdAt']) ?? '')
      ).getTime();

      const bTime = new Date(
        String(getValue(b, ['timestamp', 'created_at', 'createdAt']) ?? '')
      ).getTime();

      return (Number.isFinite(bTime) ? bTime : 0) -
        (Number.isFinite(aTime) ? aTime : 0);
    })
    .slice(0, 8);

  const filteredPumps = pumps.filter((item) => {
    const pump = item.pump;
    const searchableText = [
      getValue(pump, ['pump_id', 'pump_code', 'id', 'pumpId']),
      getValue(pump, ['name', 'pump_name']),
      getValue(pump, ['location']),
      getValue(pump, ['status']),
      item.healthStatus,
    ].map((value) => show(value, '')).join(' ').toLowerCase();

    const matchesSearch = searchableText.includes(pumpSearch.trim().toLowerCase());
    const score = item.healthScore;
    const matchesHealth =
      pumpHealthFilter === 'all' ||
      (pumpHealthFilter === 'healthy' && score !== null && score >= 80) ||
      (pumpHealthFilter === 'warning' && score !== null && score >= 60 && score < 80) ||
      (pumpHealthFilter === 'critical' && score !== null && score < 60) ||
      (pumpHealthFilter === 'unavailable' && score === null);

    return matchesSearch && matchesHealth;
  });

  const modelName = show(
    getValue(model, ['model_name', 'name', 'model']),
    'Experimental ML model'
  );

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>AQUAINTEL · PREDICTIVE MAINTENANCE</p>
          <h1 style={styles.heading}>Water Pump Monitoring Dashboard</h1>
          <p style={styles.headerText}>
            Monitor pump health, sensor readings, alerts, and maintenance
            indicators in one place.
          </p>
        </div>

        <div style={styles.headerActions}>
          <span style={styles.updatedText}>
            {lastUpdated ? `Updated ${lastUpdated}` : 'Not updated yet'}
          </span>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Loading…' : 'Refresh data'}
          </button>
        </div>
      </header>

      <nav aria-label="Dashboard navigation" style={styles.navigation}>
        {[
          { id: 'dashboard-overview', label: 'Overview' },
          { id: 'pump-health', label: 'Pump Health' },
          { id: 'dashboard-charts', label: 'Analytics' },
          { id: 'recent-alerts', label: 'Alerts' },
          { id: 'system-overview', label: 'System Overview' },
          { id: 'ml-information', label: 'ML Model' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              document.getElementById(item.id)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            }
            style={styles.navButton}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {selectedPump && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedPump(null);
          }}
          style={styles.modalBackdrop}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="pump-detail-title" style={styles.detailModal}>
            <div style={styles.detailHeader}>
              <div>
                <p style={styles.eyebrow}>PUMP DETAILS</p>
                <h2 id="pump-detail-title" style={styles.sectionTitle}>
                  {show(getValue(selectedPump.pump, ['pump_id', 'pump_code', 'id', 'pumpId']), 'Pump')} · {show(getValue(selectedPump.pump, ['name', 'pump_name']), 'Unnamed pump')}
                </h2>
                <p style={styles.sectionDescription}>Pump information, health status, and the backend prediction response.</p>
              </div>
              <button type="button" onClick={() => setSelectedPump(null)} style={styles.closeButton} aria-label="Close pump details">✕ Close</button>
            </div>

            <div style={styles.detailGrid}>
              {[
                ['Pump ID', getValue(selectedPump.pump, ['pump_id', 'pump_code', 'id', 'pumpId'])],
                ['Name', getValue(selectedPump.pump, ['name', 'pump_name'])],
                ['Location', getValue(selectedPump.pump, ['location'])],
                ['Operational status', getValue(selectedPump.pump, ['status'])],
                ['Health score', selectedPump.healthScore === null ? 'Unavailable' : `${selectedPump.healthScore.toFixed(1)}/100`],
                ['Health status', selectedPump.healthStatus],
              ].map(([label, value]) => (
                <div key={String(label)} style={styles.detailItem}>
                  <span style={styles.overviewKey}>{String(label)}</span>
                  <strong>{show(value)}</strong>
                </div>
              ))}
            </div>

            <div style={styles.healthSummary}>
              <div style={styles.healthSummaryTop}>
                <span style={styles.overviewKey}>Overall health score</span>
                <strong style={{ color: getHealthColor(selectedPump.healthScore) }}>
                  {selectedPump.healthScore === null ? 'Unavailable' : `${selectedPump.healthScore.toFixed(1)} / 100`}
                </strong>
              </div>
              <div style={styles.healthTrack} aria-label="Pump health score">
                <div style={{
                  ...styles.healthFill,
                  width: `${Math.max(0, Math.min(100, selectedPump.healthScore ?? 0))}%`,
                  background: getHealthColor(selectedPump.healthScore),
                }} />
              </div>
              <p style={styles.healthHint}>
                Health score is a demonstration indicator based on the backend rules, not a certified safety assessment.
              </p>
            </div>

            <h3 style={{ ...styles.sectionTitle, marginTop: 22 }}>Prediction details</h3>
            {pumpDetailLoading ? (
              <p style={styles.emptyMessage}>Loading prediction details…</p>
            ) : pumpPrediction ? (
              <>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.overviewKey}>Failure probability (API output)</span>
                    <strong style={{ fontSize: 22, color: '#b91c1c' }}>
                      {(() => {
                        const raw = getValue(pumpPrediction, ['failure_probability', 'failureProbability']);
                        const value = typeof raw === 'number' ? raw : Number(raw);
                        return raw !== undefined && raw !== null && raw !== '' && Number.isFinite(value)
                          ? `${value}%`
                          : 'Not provided';
                      })()}
                    </strong>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.overviewKey}>Risk level</span>
                    <strong>{show(getValue(pumpPrediction, ['risk_level', 'riskLevel']), 'Not provided')}</strong>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.overviewKey}>Maintenance priority</span>
                    <strong>{show(getValue(
                      typeof pumpPrediction.maintenance === 'object' && pumpPrediction.maintenance !== null
                        ? pumpPrediction.maintenance as Row
                        : {},
                      ['priority']
                    ), 'Not provided')}</strong>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.overviewKey}>Prediction timestamp</span>
                    <strong>{formatDate(getValue(pumpPrediction, ['timestamp', 'created_at']))}</strong>
                  </div>
                </div>

                <div style={styles.predictionBox}>
                  {[
                    ['Pump ID', getValue(pumpPrediction, ['pump_id', 'pumpId'])],
                    ['Pump name', getValue(pumpPrediction, ['pump_name', 'pumpName'])],
                    ['API health score', getValue(pumpPrediction, ['health_score', 'healthScore'])],
                    ['API health status', getValue(pumpPrediction, ['health_status', 'healthStatus'])],
                  ].map(([label, value]) => (
                    <div key={String(label)} style={styles.overviewRow}>
                      <span style={styles.overviewKey}>{String(label)}</span>
                      <strong style={styles.overviewValue}>{show(value)}</strong>
                    </div>
                  ))}
                </div>

                {(() => {
                  const maintenanceValue = pumpPrediction.maintenance;
                  const maintenance = typeof maintenanceValue === 'object' && maintenanceValue !== null
                    ? maintenanceValue as Row
                    : {};
                  const rawRecommendations = maintenance.recommendations;
                  const recommendations = Array.isArray(rawRecommendations)
                    ? rawRecommendations.filter((item): item is string => typeof item === 'string')
                    : [];
                  return (
                    <section style={{ marginTop: 18 }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: 15 }}>Maintenance recommendations</h4>
                      {recommendations.length > 0 ? (
                        <ol style={{ margin: 0, paddingLeft: 22, color: '#334155', lineHeight: 1.7 }}>
                          {recommendations.map((recommendation, index) => (
                            <li key={`${index}-${recommendation}`} style={{ padding: '4px 0' }}>{recommendation}</li>
                          ))}
                        </ol>
                      ) : (
                        <p style={styles.emptyMessage}>No maintenance recommendations were returned by the API.</p>
                      )}
                    </section>
                  );
                })()}
                <div style={styles.disclaimer}>
                  <strong>Note:</strong> Failure probability and risk are displayed as returned by the backend. They are experimental outputs, not a guarantee that the pump will fail. Verify the pump and sensor readings before making maintenance decisions.
                </div>
              </>
            ) : (
              <p style={styles.emptyMessage}>No prediction response available.</p>
            )}
            {pumpDetailError && <p role="status" style={styles.actionError}>{pumpDetailError}</p>}

            <h3 style={{ ...styles.sectionTitle, marginTop: 22 }}>Related records</h3>
            <div style={styles.detailGrid}>
              <div style={styles.detailItem}>
                <span style={styles.overviewKey}>Telemetry records currently loaded</span>
                <strong>{telemetry.filter((row) => String(getValue(row, ['pump_id', 'pumpId', 'asset_id'])) === String(getPumpId(selectedPump.pump))).length}</strong>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.overviewKey}>Related alerts currently loaded</span>
                <strong>{alerts.filter((row) => String(getValue(row, ['pump_id', 'pumpId', 'asset_id'])) === String(getPumpId(selectedPump.pump))).length}</strong>
              </div>
            </div>
            <p style={styles.smallNote}>Counts reflect records currently returned by the API; they may be zero if the backend uses a different field name or pagination.</p>
            <div style={{ ...styles.alertActions, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setSelectedPump(null); document.getElementById('recent-alerts')?.scrollIntoView({ behavior: 'smooth' }); }} style={styles.button}>View alerts section</button>
              <button type="button" onClick={() => setSelectedPump(null)} style={styles.closeButton}>Done</button>
            </div>
          </section>
        </div>
      )}

      {error && (
        <div role="alert" style={styles.errorBox}>
          <strong>Connection issue:</strong> {error}
          <p style={{ margin: '8px 0 0' }}>
            Start the FastAPI backend, then select Refresh data.
          </p>
        </div>
      )}

      {loading && pumps.length === 0 && (
        <div style={styles.infoBox}>Loading AquaIntel dashboard…</div>
      )}

      <div id="dashboard-overview" style={{ ...styles.statsGrid, scrollMarginTop: 90 }}>
        <StatCard
          title="Total Pumps"
          value={pumps.length}
          subtitle="Pumps returned by the API"
        />
        <StatCard
          title="Healthy Pumps"
          value={healthyCount}
          subtitle="Health score of 80–100"
        />
        <StatCard
          title="Warning Pumps"
          value={warningCount}
          subtitle="Health score of 60–79.99"
        />
        <StatCard
          title="Critical / Severe"
          value={criticalCount}
          subtitle="Health score below 60"
        />
        <StatCard
          title="Unresolved Alerts"
          value={unresolvedAlerts}
          subtitle="Includes acknowledged alerts until resolved"
        />
      </div>

      <div id="dashboard-charts" style={styles.anchorSection}>
        <DashboardCharts
          pumps={pumps}
          alerts={alerts}
          telemetry={telemetry}
        />
      </div>

      <section id="pump-health" style={{ ...styles.panel, scrollMarginTop: 90 }}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Pump Health Monitoring</h2>
            <p style={styles.sectionDescription}>
              Health scores are calculated by the backend from the latest
              available telemetry for each pump.
            </p>
          </div>
          <span style={styles.countPill}>{pumps.length} pumps</span>
        </div>

        <div style={styles.pumpFilters}>
          <label style={styles.filterLabel}>
            <span>Search pumps</span>
            <input
              type="search"
              value={pumpSearch}
              onChange={(event) => setPumpSearch(event.target.value)}
              placeholder="Search ID, name, location…"
              style={styles.searchInput}
            />
          </label>
          <label style={styles.filterLabel}>
            <span>Health status</span>
            <select
              value={pumpHealthFilter}
              onChange={(event) => setPumpHealthFilter(event.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All pumps</option>
              <option value="healthy">Healthy (80–100)</option>
              <option value="warning">Warning (60–79)</option>
              <option value="critical">Critical (below 60)</option>
              <option value="unavailable">Health unavailable</option>
            </select>
          </label>
          <span style={styles.filterCount}>Showing {filteredPumps.length} of {pumps.length} pumps</span>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Pump ID</th>
                <th style={styles.th}>Pump Name</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Operational Status</th>
                <th style={styles.th}>Health Score</th>
                <th style={styles.th}>Health Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPumps.map((item, index) => {
                const pump = item.pump;

                return (
                  <tr
                    key={String(getValue(pump, ['id', 'pump_id'], index))}
                    onClick={() => void openPumpDetails(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        void openPumpDetails(item);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Open details for ${show(getValue(pump, ['pump_id', 'pump_code', 'id']), 'pump')}`}
                    style={styles.clickableRow}
                  >
                    <td style={styles.td}>
                      <strong>
                        {show(getValue(pump, ['pump_id', 'pump_code']))}
                      </strong>
                    </td>
                    <td style={styles.td}>
                      {show(getValue(pump, ['name', 'pump_name']))}
                    </td>
                    <td style={styles.td}>
                      {show(getValue(pump, ['location']))}
                    </td>
                    <td style={styles.td}>
                      <StatusLabel
                        value={show(getValue(pump, ['status']), 'Unknown')}
                      />
                    </td>
                    <td style={styles.td}>
                      {item.healthScore === null ? (
                        <span style={{ color: '#64748b' }}>Unavailable</span>
                      ) : (
                        <div style={styles.scoreCell}>
                          <div style={styles.scoreTrack}>
                            <div
                              style={{
                                ...styles.scoreFill,
                                width: `${Math.max(
                                  0,
                                  Math.min(100, item.healthScore)
                                )}%`,
                                background: getHealthColor(item.healthScore),
                              }}
                            />
                          </div>
                          <strong
                            style={{
                              color: getHealthColor(item.healthScore),
                            }}
                          >
                            {item.healthScore.toFixed(1)}/100
                          </strong>
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <StatusLabel value={item.healthStatus} />
                      {item.healthError && (
                        <p style={styles.smallNote}>
                          Check health endpoint
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredPumps.length === 0 && (
                <tr>
                  <td style={styles.emptyCell} colSpan={6}>
                    {pumps.length === 0
                      ? 'No pumps found. Check the backend and seed data.'
                      : 'No pumps match your search or selected health status.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div style={styles.twoColumnGrid}>
        <section id="recent-alerts" style={{ ...styles.panel, scrollMarginTop: 90 }}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Recent Alerts</h2>
              <p style={styles.sectionDescription}>
                Latest alert records returned by the backend.
              </p>
            </div>
            <span style={styles.countPill}>{alerts.length} total</span>
          </div>

          {alertActionMessage && (
            <p role="status" style={styles.actionSuccess}>
              {alertActionMessage}
            </p>
          )}
          {alertActionError && (
            <p role="alert" style={styles.actionError}>
              {alertActionError}
            </p>
          )}

          {recentAlerts.length === 0 ? (
            <p style={styles.emptyMessage}>No alerts available.</p>
          ) : (
            <div style={styles.alertList}>
              {recentAlerts.map((alert, index) => {
                const status = show(
                  getValue(alert, ['status', 'state']),
                  'Triggered'
                );
                const normalizedStatus = status.toLowerCase();
                const isResolved = ['resolved', 'closed'].includes(normalizedStatus);
                const isAcknowledged = normalizedStatus === 'acknowledged';
                const alertId = getValue(alert, ['id', 'alert_id', 'alertId']);
                const idText = show(alertId, String(index));
                const acknowledgeBusy = alertActionLoading === `${idText}:acknowledge`;
                const resolveBusy = alertActionLoading === `${idText}:resolve`;

                return (
                  <article
                    key={String(getValue(alert, ['id', 'alert_id'], index))}
                    style={styles.alertItem}
                  >
                    <div style={styles.alertTopLine}>
                      <strong style={styles.alertTitle}>
                        {show(
                          getValue(alert, [
                            'message',
                            'description',
                            'title',
                            'rule_name',
                          ]),
                          'Pump alert'
                        )}
                      </strong>
                      <StatusLabel value={status} />
                    </div>
                    <p style={styles.alertMeta}>
                      Alert ID: {show(getValue(alert, ['id', 'alert_id']))}
                      {' · '}
                      Pump: {show(
                        getValue(alert, ['pump_id', 'pumpId']),
                        '—'
                      )}
                    </p>
                    <p style={styles.alertMeta}>
                      {formatDate(
                        getValue(alert, [
                          'timestamp',
                          'created_at',
                          'createdAt',
                        ])
                      )}
                    </p>
                    <div style={styles.alertActions}>
                      {!isAcknowledged && !isResolved && (
                        <button
                          type="button"
                          onClick={() => void handleAlertAction(alert, 'acknowledge')}
                          disabled={alertActionLoading !== null || loading}
                          style={{
                            ...styles.actionButton,
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            opacity: alertActionLoading !== null || loading ? 0.6 : 1,
                            cursor: alertActionLoading !== null || loading ? 'wait' : 'pointer',
                          }}
                        >
                          {acknowledgeBusy ? 'Acknowledging…' : 'Acknowledge'}
                        </button>
                      )}
                      {!isResolved && (
                        <button
                          type="button"
                          onClick={() => void handleAlertAction(alert, 'resolve')}
                          disabled={alertActionLoading !== null || loading}
                          style={{
                            ...styles.actionButton,
                            background: '#dcfce7',
                            color: '#166534',
                            opacity: alertActionLoading !== null || loading ? 0.6 : 1,
                            cursor: alertActionLoading !== null || loading ? 'wait' : 'pointer',
                          }}
                        >
                          {resolveBusy ? 'Resolving…' : 'Resolve'}
                        </button>
                      )}
                      {isResolved && (
                        <span style={styles.resolvedNote}>This alert is resolved.</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="system-overview" style={{ ...styles.panel, scrollMarginTop: 90 }}>
          <h2 style={styles.sectionTitle}>System Overview</h2>
          <p style={styles.sectionDescription}>
            Summary values provided by the analytics API.
          </p>

          <div style={styles.overviewList}>
            {Object.entries(overview).length > 0 ? (
              Object.entries(overview).map(([key, value]) => (
                <div key={key} style={styles.overviewRow}>
                  <span style={styles.overviewKey}>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <strong style={styles.overviewValue}>
                    {show(value)}
                  </strong>
                </div>
              ))
            ) : (
              <p style={styles.emptyMessage}>
                Overview data is not available.
              </p>
            )}

            <div style={styles.overviewRow}>
              <span style={styles.overviewKey}>Telemetry records loaded</span>
              <strong style={styles.overviewValue}>
                {telemetry.length}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <section id="ml-information" style={{ ...styles.panel, scrollMarginTop: 90 }}>
        <h2 style={styles.sectionTitle}>Machine Learning Information</h2>
        <p style={styles.sectionDescription}>
          Information returned by the backend ML endpoint.
        </p>

        <div style={styles.mlGrid}>
          <div style={styles.mlItem}>
            <span style={styles.overviewKey}>Model</span>
            <strong>{modelName}</strong>
          </div>

          {Object.entries(model).map(([key, value]) => (
            <div key={key} style={styles.mlItem}>
              <span style={styles.overviewKey}>
                {key.replace(/_/g, ' ')}
              </span>
              <strong>{show(value)}</strong>
            </div>
          ))}
        </div>

        <div style={styles.disclaimer}>
          <strong>Important:</strong> ML outputs are experimental and should
          not be treated as confirmed failure predictions. Health scores
          and alert thresholds are rule-based demonstration indicators and
          require validation against real pump operating data before use
          for safety-critical decisions.
        </div>
      </section>

      <footer style={styles.footer}>
        AquaIntel · Water Pump Monitoring and Predictive Maintenance
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '28px clamp(14px, 3vw, 38px)',
    background: '#f4f7fb',
    color: '#172033',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 26,
  },
  eyebrow: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.4,
    margin: '0 0 10px',
  },
  heading: {
    fontSize: 'clamp(25px, 3vw, 35px)',
    letterSpacing: -1,
    margin: '0 0 10px',
    fontWeight: 800,
  },
  headerText: {
    color: '#64748b',
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 700,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  updatedText: {
    fontSize: 12,
    color: '#64748b',
  },
  button: {
    background: '#2563eb',
    border: 'none',
    borderRadius: 9,
    color: '#fff',
    padding: '11px 16px',
    fontWeight: 700,
    fontSize: 13,
  },
  navigation: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    marginBottom: 22,
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
    position: 'sticky',
    top: 8,
    zIndex: 10,
  },
  navButton: {
    border: '1px solid transparent',
    borderRadius: 9,
    background: '#eff6ff',
    color: '#1d4ed8',
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  anchorSection: {
    scrollMarginTop: 90,
    marginBottom: 24,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 185px), 1fr))',
    gap: 15,
    marginBottom: 24,
  },
  statCard: {
    background: '#fff',
    border: '1px solid #e5eaf2',
    borderRadius: 14,
    padding: 19,
    boxShadow: '0 4px 18px rgba(15, 23, 42, 0.025)',
  },
  statTitle: {
    fontSize: 12,
    color: '#64748b',
    margin: '0 0 12px',
    fontWeight: 600,
  },
  statValue: {
    fontSize: 30,
    lineHeight: 1.15,
    fontWeight: 800,
    letterSpacing: -0.7,
  },
  statSubtitle: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#94a3b8',
    margin: '10px 0 0',
  },
  panel: {
    background: '#fff',
    border: '1px solid #e5eaf2',
    borderRadius: 15,
    padding: 21,
    marginBottom: 22,
    minWidth: 0,
    boxShadow: '0 4px 18px rgba(15, 23, 42, 0.025)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 17,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    margin: '0 0 6px',
  },
  sectionDescription: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 1.6,
    margin: 0,
  },
  countPill: {
    fontSize: 11,
    color: '#334155',
    background: '#f1f5f9',
    borderRadius: 20,
    padding: '6px 10px',
    fontWeight: 700,
  },
  pumpFilters: {
    display: 'flex',
    alignItems: 'end',
    flexWrap: 'wrap',
    gap: 14,
    margin: '18px 0 14px',
  },
  filterLabel: {
    display: 'grid',
    gap: 7,
    color: '#475569',
    fontSize: 11,
    fontWeight: 700,
    minWidth: 190,
  },
  searchInput: {
    width: 'min(100%, 310px)',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    background: '#fff',
    color: '#172033',
    padding: '10px 12px',
    font: 'inherit',
    fontWeight: 500,
    outlineOffset: 2,
  },
  filterSelect: {
    minWidth: 205,
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    background: '#fff',
    color: '#172033',
    padding: '10px 12px',
    font: 'inherit',
    fontWeight: 500,
  },
  filterCount: {
    color: '#64748b',
    fontSize: 11,
    paddingBottom: 10,
  },
  tableWrap: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: 12,
  },
  th: {
    background: '#f8fafc',
    color: '#64748b',
    fontWeight: 700,
    padding: '12px 13px',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #e5eaf2',
  },
  td: {
    padding: '14px 13px',
    borderBottom: '1px solid #edf1f6',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  scoreCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 145,
  },
  scoreTrack: {
    width: 66,
    height: 7,
    background: '#e2e8f0',
    borderRadius: 20,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 20,
  },
  statusLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 20,
    padding: '5px 9px',
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  smallNote: {
    margin: '5px 0 0',
    fontSize: 10,
    color: '#b45309',
  },
  emptyCell: {
    textAlign: 'center',
    padding: 25,
    color: '#64748b',
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
    gap: 20,
    alignItems: 'start',
  },
  alertList: {
    display: 'grid',
    gap: 0,
  },
  alertItem: {
    padding: '14px 0',
    borderBottom: '1px solid #edf1f6',
  },
  alertTopLine: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  alertTitle: {
    fontSize: 12,
    lineHeight: 1.6,
    overflowWrap: 'anywhere',
  },
  alertMeta: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 1.5,
    margin: '7px 0 0',
  },
  alertActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 11,
  },
  actionButton: {
    border: 'none',
    borderRadius: 7,
    padding: '8px 11px',
    fontSize: 11,
    fontWeight: 700,
  },
  resolvedNote: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: 700,
    padding: '7px 0',
  },
  actionSuccess: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 12,
    margin: '12px 0',
  },
  actionError: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 12,
    margin: '12px 0',
  },
  emptyMessage: {
    color: '#64748b',
    fontSize: 13,
    padding: '16px 0',
  },
  overviewList: {
    marginTop: 18,
  },
  overviewRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderBottom: '1px solid #edf1f6',
    padding: '12px 0',
  },
  overviewKey: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  overviewValue: {
    fontSize: 12,
    textAlign: 'right',
    overflowWrap: 'anywhere',
  },
  mlGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
    gap: 12,
    marginTop: 17,
  },
  mlItem: {
    display: 'grid',
    gap: 9,
    padding: 14,
    background: '#f8fafc',
    border: '1px solid #e5eaf2',
    borderRadius: 10,
    fontSize: 12,
    overflowWrap: 'anywhere',
  },
  disclaimer: {
    marginTop: 18,
    padding: 14,
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 10,
    color: '#854d0e',
    fontSize: 12,
    lineHeight: 1.7,
  },
  errorBox: {
    padding: 16,
    marginBottom: 20,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 10,
    color: '#991b1b',
    fontSize: 13,
  },
  infoBox: {
    padding: 15,
    marginBottom: 20,
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 10,
    color: '#1d4ed8',
    fontSize: 13,
  },
  clickableRow: {
    cursor: 'pointer',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(15, 23, 42, 0.58)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  detailModal: {
    width: 'min(900px, 100%)',
    maxHeight: 'min(88vh, 900px)',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 18,
    padding: 24,
    boxSizing: 'border-box',
    boxShadow: '0 24px 80px rgba(15, 23, 42, 0.28)',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    margin: '-24px -24px 18px',
    padding: '22px 24px 16px',
    position: 'sticky',
    top: -24,
    zIndex: 5,
    background: '#ffffff',
    borderBottom: '1px solid #e5eaf2',
  },
  healthSummary: {
    marginTop: 16,
    padding: 15,
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    background: '#ffffff',
  },
  healthSummaryTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  healthTrack: {
    height: 9,
    width: '100%',
    borderRadius: 99,
    overflow: 'hidden',
    background: '#e2e8f0',
  },
  healthFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width 180ms ease',
  },
  healthHint: {
    margin: '9px 0 0',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#64748b',
  },
  closeButton: {
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    background: '#ffffff',
    color: '#334155',
    padding: '10px 13px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
    gap: 12,
    marginTop: 18,
  },
  detailItem: {
    display: 'grid',
    gap: 8,
    padding: 14,
    background: '#f8fafc',
    border: '1px solid #e5eaf2',
    borderRadius: 10,
    fontSize: 13,
    overflowWrap: 'anywhere',
  },
  predictionBox: {
    padding: '4px 14px',
    background: '#f8fafc',
    border: '1px solid #e5eaf2',
    borderRadius: 10,
    marginTop: 12,
  },
  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    padding: '8px 0 20px',
  },
};

export default App;