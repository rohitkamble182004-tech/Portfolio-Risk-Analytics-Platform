// frontend/pages/risk/var.tsx — Fixed Mobile, Tablet & Desktop

import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { usePortfolio, usePortfolioList } from "../../hooks/usePortfolio";
import { useRiskMetrics } from "../../hooks/useRiskMetrics";
import { riskApi } from "../../services/riskApi";
import { safeNumber, safeCurrency, safePercent } from "../../utils/dataAdapter";

type NavKey = "dashboard" | "portfolio" | "simulation" | "risk" | "settings";

/* ─── Icons ───────────────────────────────────────────────────────────── */
const ICONS: Record<NavKey, React.ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  simulation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  risk: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
    </svg>
  ),
};

const NAV_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "dashboard", label: "Dashboard", href: "/" },
  { key: "portfolio", label: "Portfolio", href: "/portfolio" },
  { key: "simulation", label: "Simulation", href: "/simulation" },
  { key: "risk", label: "Risk", href: "/risk/var" },
  { key: "settings", label: "Settings", href: "/settings" },
];

/* ─── Bottom tab bar ──────────────────────────────────────────────────── */
function BottomTabBar({ active }: { active: NavKey }) {
  return (
    <nav className="bottom-tab-bar" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`bottom-tab-bar__item ${active === item.key ? "active" : ""}`}
        >
          <span className="bottom-tab-bar__icon">{ICONS[item.key]}</span>
          <span className="bottom-tab-bar__label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/* ─── Risk Metric Card ──────────────────────────────────────────────────── */
function RiskMetricCard({
  label,
  value,
  sub,
  color,
  tooltip,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  tooltip?: string;
}) {
  return (
    <div className="risk-metric-card">
      <div className="risk-metric-card__label" title={tooltip}>
        {label}
        {tooltip && <span className="risk-metric-card__tooltip">ⓘ</span>}
      </div>
      <div className="risk-metric-card__value" style={color ? { color } : {}}>
        {value || "—"}
      </div>
      {sub && <div className="risk-metric-card__sub">{sub}</div>}
    </div>
  );
}

/* ─── Method selector ───────────────────────────────────────────────────── */
function MethodSelector({
  methods,
  selected,
  onChange,
}: {
  methods: { id: string; description: string }[];
  selected: string;
  onChange: (method: string) => void;
}) {
  return (
    <div className="method-selector">
      <span className="method-selector__label">Calculation Method</span>
      <div className="method-selector__options">
        {methods.map((m) => (
          <button
            key={m.id}
            className={`method-selector__option ${selected === m.id ? "active" : ""}`}
            onClick={() => onChange(m.id)}
          >
            {m.id.charAt(0).toUpperCase() + m.id.slice(1)}
            <span className="method-selector__desc">{m.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Safe formatter helpers ───────────────────────────────────────────── */
const fmtCurrency = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
};

const fmtPercent = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(2)}%`;
};

/* ─── VaR / CVaR Page ──────────────────────────────────────────────────── */
const VaRPage: NextPage = () => {
  const router = useRouter();
  const portfolioId = (router.query.id as string) ?? null;

  const { portfolios, isLoading: portfoliosLoading } = usePortfolioList();
  const [selectedId, setSelectedId] = useState<string | null>(portfolioId);
  const [method, setMethod] = useState<string>("historical");
  const [confidence, setConfidence] = useState<number>(0.95);
  const [horizon, setHorizon] = useState<number>(1);
  const [methods, setMethods] = useState<{ id: string; description: string }[]>([]);

  const { portfolio } = usePortfolio(selectedId);

  const riskPositions = Array.isArray(portfolio?.holdings)
    ? portfolio.holdings.map((h: any) => ({
        symbol: h.ticker,
        marketValue: safeNumber(h.marketValue),
      }))
    : [];

  const {
    metrics,
    isLoading: riskLoading,
    error: riskError,
    refresh,
  } = useRiskMetrics(selectedId, riskPositions);

  useEffect(() => {
    riskApi.getMethods().then((data) => {
      setMethods(data.methods || []);
    }).catch(() => {});
  }, []);

  const selectedPortfolio = portfolios.find((p) => p.id === selectedId);
  const totalValue = portfolio?.totalValue || 0;

  const handleRunAnalysis = () => {
    refresh();
  };

  const varData = metrics?.var;
  const cvarData = metrics?.cvar;

  return (
    <>
      <Head><title>VaR / CVaR — RiskLens</title></Head>
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <Link href="/" className="app-header__brand">
            <div className="app-header__brand-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#02030a" strokeWidth="2.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            RiskLens
          </Link>
          <div className="app-header__center">
            {selectedPortfolio && (
              <div className="app-header__portfolio-name">{selectedPortfolio.name}</div>
            )}
          </div>
          <div className="app-header__right">
            <div className="app-header__status">
              <div className="status-dot" />
              Live
            </div>
          </div>
        </header>

        {/* Sidebar */}
        <aside className="app-sidebar">
          <div className="sidebar-section">Main</div>
          <Link href="/" className="sidebar-item">Dashboard</Link>
          <Link href="/portfolio" className="sidebar-item">Portfolios</Link>
          <Link href="/simulation" className="sidebar-item">Simulation</Link>

          <div className="sidebar-section" style={{ marginTop: 8 }}>Risk</div>
          <Link href="/risk/var" className="sidebar-item active">
            <svg className="sidebar-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            VaR / CVaR
          </Link>
          <Link href="/risk/stress" className="sidebar-item">Stress Tests</Link>

          <div className="sidebar-section" style={{ marginTop: 8 }}>Settings</div>
          <Link href="/settings" className="sidebar-item">
            <svg className="sidebar-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            Preferences
          </Link>
        </aside>

        {/* Main */}
        <main className="page-content animate-in">
          <div className="page-header">
            <div>
              <h1 className="page-header__title">Value at Risk (VaR) & CVaR</h1>
              <p className="page-header__sub">
                Measure portfolio risk using Value at Risk and Conditional Value at Risk
              </p>
            </div>
          </div>

          {/* Portfolio Selector */}
          <div className="sim-selector-bar">
            <span className="form-label" style={{ whiteSpace: "nowrap" }}>Portfolio</span>
            {portfoliosLoading ? (
              <span className="spinner" style={{ width: 16, height: 16 }} />
            ) : portfolios.length === 0 ? (
              <Link href="/portfolio" className="btn btn-secondary btn-sm">
                Create a portfolio first →
              </Link>
            ) : (
              <select
                className="form-select"
                style={{ maxWidth: 300 }}
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value || null)}
              >
                <option value="">— Select portfolio —</option>
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({safeCurrency(p.totalValue)})
                  </option>
                ))}
              </select>
            )}
            {selectedPortfolio && (
              <span className="selector-meta">
                {selectedPortfolio.holdingCount || 0} holdings · {safeCurrency(totalValue)}
              </span>
            )}
          </div>

          {!selectedId ? (
            <div className="empty-state" style={{ marginTop: 24 }}>
              <div className="empty-state__icon">📊</div>
              <h3>Select a portfolio to analyze</h3>
              <p>Choose a portfolio above to view its VaR and CVaR metrics.</p>
            </div>
          ) : (
            <div className="var-layout">
              {/* Controls */}
              <aside className="var-controls">
                <div className="var-controls__title">Parameters</div>

                <div className="form-group">
                  <label className="form-label">Confidence Level</label>
                  <div className="btn-group">
                    {[0.90, 0.95, 0.99].map((c) => (
                      <button
                        key={c}
                        className={`btn btn-sm ${confidence === c ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => setConfidence(c)}
                        disabled={riskLoading}
                      >
                        {(c * 100).toFixed(0)}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Time Horizon (days)</label>
                  <div className="btn-group">
                    {[1, 5, 10, 21].map((d) => (
                      <button
                        key={d}
                        className={`btn btn-sm ${horizon === d ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => setHorizon(d)}
                        disabled={riskLoading}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {methods.length > 0 && (
                  <MethodSelector
                    methods={methods}
                    selected={method}
                    onChange={setMethod}
                  />
                )}

                <button
                  className="btn btn-primary var-run-btn"
                  onClick={handleRunAnalysis}
                  disabled={riskLoading}
                >
                  {riskLoading ? <span className="spinner" /> : "↻ Run Analysis"}
                </button>
              </aside>

              {/* Results */}
              <div className="var-results">
                {riskLoading ? (
                  <div className="var-loading">
                    <span className="spinner" style={{ width: 32, height: 32 }} />
                    <p>Calculating risk metrics...</p>
                  </div>
                ) : riskError ? (
                  <div className="alert alert-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {riskError}
                  </div>
                ) : varData ? (
                  <div className="var-results__inner">
                    {/* VaR / CVaR Cards */}
                    <div className="var-grid">
                      <RiskMetricCard
                        label={`VaR ${(confidence * 100).toFixed(0)}%`}
                        value={fmtCurrency(varData.varDollar)}
                        sub={`${fmtPercent(varData.varPct)} of portfolio value`}
                        color="var(--red-bright)"
                        tooltip="Maximum expected loss over the specified time horizon at the given confidence level"
                      />
                      <RiskMetricCard
                        label={`CVaR ${(confidence * 100).toFixed(0)}%`}
                        value={cvarData ? fmtCurrency(cvarData.cvarDollar) : "—"}
                        sub={cvarData ? `${fmtPercent(cvarData.cvarPct)} of portfolio value` : undefined}
                        color="var(--orange)"
                        tooltip="Expected loss beyond the VaR threshold"
                      />
                      <RiskMetricCard
                        label="Sharpe Ratio"
                        value={metrics.sharpeRatio != null && Number.isFinite(metrics.sharpeRatio) ? metrics.sharpeRatio.toFixed(3) : "—"}
                        sub="Risk-adjusted return"
                        color="var(--cyan)"
                      />
                      <RiskMetricCard
                        label="Sortino Ratio"
                        value={metrics.sortinoRatio != null && Number.isFinite(metrics.sortinoRatio) ? metrics.sortinoRatio.toFixed(3) : "—"}
                        sub="Downside risk-adjusted return"
                        color="var(--blue)"
                      />
                    </div>

                    {/* Additional Metrics */}
                    <div className="var-metrics-grid">
                      <RiskMetricCard
                        label="Max Drawdown"
                        value={metrics.maxDrawdown != null && Number.isFinite(metrics.maxDrawdown) ? `${(Math.abs(metrics.maxDrawdown) * 100).toFixed(2)}%` : "—"}
                        sub="Peak to trough decline"
                        color="var(--red-bright)"
                      />
                      <RiskMetricCard
                        label="Annualized Volatility"
                        value={metrics.annualizedVolatility != null && Number.isFinite(metrics.annualizedVolatility) ? `${(metrics.annualizedVolatility * 100).toFixed(2)}%` : "—"}
                        sub="Standard deviation of returns"
                      />
                      <RiskMetricCard
                        label="Annualized Return"
                        value={metrics.annualizedReturn != null && Number.isFinite(metrics.annualizedReturn) ? `${(metrics.annualizedReturn * 100).toFixed(2)}%` : "—"}
                        sub="Average annual return"
                        color={metrics.annualizedReturn != null && Number.isFinite(metrics.annualizedReturn) && metrics.annualizedReturn > 0 ? "var(--green-bright)" : "var(--red-bright)"}
                      />
                      <RiskMetricCard
                        label="Correlation Matrix"
                        value={metrics.correlationMatrix ? `${metrics.correlationMatrix.length}×${metrics.correlationMatrix[0]?.length || 0}` : "—"}
                        sub={`${metrics.tickers?.length || 0} assets`}
                      />
                    </div>

                    {/* Method Info */}
                    <div className="card" style={{ padding: 16 }}>
                      <div className="card-title">Method Details</div>
                      <div className="method-badges">
                        <span className="badge badge-cyan">Method: {varData.method || "historical"}</span>
                        <span className="badge badge-neutral">Confidence: {(varData.confidenceLevel * 100).toFixed(0)}%</span>
                        <span className="badge badge-neutral">Horizon: {varData.timeHorizon} day{varData.timeHorizon > 1 ? "s" : ""}</span>
                      </div>
                      <p className="method-desc">
                        {varData.method === "historical" 
                          ? "Historical simulation uses empirical return distribution from the lookback period."
                          : "Parametric method assumes normally distributed returns with EWMA covariance estimation."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state__icon">📈</div>
                    <h3>No risk data available</h3>
                    <p>Run the analysis to calculate VaR and CVaR metrics.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <BottomTabBar active="risk" />

      <style>{`
        /* ════════════════════════════════════════════════════════════════════════
           GLOBAL STYLES - Must be defined at root level
           ════════════════════════════════════════════════════════════════════════ */
        :root {
          --header-h: 52px;
          --r-lg: 8px;
          --r-xl: 12px;
          --r-md: 6px;
          --font-mono: 'SF Mono', 'Fira Code', monospace;
          --font-display: 'Inter', system-ui, -apple-system, sans-serif;
          --cyan: #00e5cc;
          --red-bright: #ff6b6b;
          --orange: #ffa94d;
          --blue: #4dabf7;
          --green-bright: #69db7c;
        }

        /* ── App shell ─────────────────────────────────────────────────────────── */
        .app-shell {
          display: grid;
          grid-template-columns: 220px 1fr;
          grid-template-areas: "sidebar header" "sidebar content";
          grid-template-rows: var(--header-h) 1fr;
          min-height: 100vh;
          background: var(--bg-app);
        }

        .app-header {
          grid-area: header;
          display: flex;
          align-items: center;
          padding: 0 20px;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-subtle);
          position: sticky;
          top: 0;
          z-index: 100;
          height: var(--header-h);
          gap: 16px;
        }
        .app-header__brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--text-primary);
          text-decoration: none;
          font-family: var(--font-display);
        }
        .app-header__brand-icon {
          width: 28px;
          height: 28px;
          background: var(--cyan);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .app-header__center {
          flex: 1;
        }
        .app-header__portfolio-name {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .app-header__right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .app-header__status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--green-bright);
          animation: pulse 2s infinite;
        }

        .app-sidebar {
          grid-area: sidebar;
          background: var(--bg-surface);
          border-right: 1px solid var(--border-subtle);
          padding: 16px 12px;
          overflow-y: auto;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .sidebar-section {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          font-weight: 600;
          padding: 8px 8px 4px 8px;
          font-family: var(--font-mono);
        }
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: var(--r-md);
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.85rem;
          transition: all 0.15s;
          margin-bottom: 2px;
        }
        .sidebar-item:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }
        .sidebar-item.active {
          background: rgba(0, 229, 204, 0.08);
          color: var(--cyan);
          font-weight: 500;
        }
        .sidebar-item__icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .page-content {
          grid-area: content;
          padding: 24px 32px;
          overflow-y: auto;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        /* ── Page header ───────────────────────────────────────────────────────── */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .page-header__title {
          font-size: 1.4rem;
          font-weight: 600;
          font-family: var(--font-display);
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }
        .page-header__sub {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* ── Selector bar ──────────────────────────────────────────────────────── */
        .sim-selector-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-lg);
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .form-label {
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }
        .form-select {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-md);
          padding: 6px 12px;
          color: var(--text-primary);
          font-size: 0.85rem;
          font-family: var(--font-mono);
          outline: none;
          min-width: 180px;
        }
        .form-select:focus {
          border-color: var(--cyan);
        }

        /* ── Buttons ───────────────────────────────────────────────────────────── */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-md);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-family: var(--font-mono);
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: none;
          font-weight: 500;
        }
        .btn:hover:not(:disabled) {
          background: var(--bg-surface-hover);
          border-color: var(--border-base);
        }
        .btn-primary {
          background: var(--cyan);
          color: #02030a;
          border-color: var(--cyan);
        }
        .btn-primary:hover:not(:disabled) {
          background: #00d4b8;
          border-color: #00d4b8;
        }
        .btn-secondary {
          background: var(--bg-elevated);
          color: var(--text-secondary);
        }
        .btn-sm {
          padding: 4px 10px;
          font-size: 0.72rem;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid var(--border-subtle);
          border-top-color: var(--cyan);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* ── Cards ─────────────────────────────────────────────────────────────── */
        .card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-xl);
        }
        .card-title {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          margin-bottom: 8px;
        }

        .badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.68rem;
          font-family: var(--font-mono);
          font-weight: 500;
          border: 1px solid var(--border-subtle);
        }
        .badge-cyan {
          background: rgba(0, 229, 204, 0.08);
          color: var(--cyan);
          border-color: rgba(0, 229, 204, 0.2);
        }
        .badge-neutral {
          background: var(--bg-elevated);
          color: var(--text-muted);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .animate-in {
          animation: fadeUp 0.3s ease-out;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ════════════════════════════════════════════════════════════════════════
           DESKTOP (default): sidebar + content, 280px controls sidebar
           ════════════════════════════════════════════════════════════════════════ */
        .var-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 16px;
          align-items: start;
        }
        .var-controls {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-xl);
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: sticky;
          top: calc(var(--header-h) + 16px);
        }
        .var-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .var-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .bottom-tab-bar {
          display: none !important;
        }

        /* ════════════════════════════════════════════════════════════════════════
           TABLET (769px – 1024px): sidebar visible, 2-col metric grids
           ════════════════════════════════════════════════════════════════════════ */
        @media (max-width: 1024px) and (min-width: 769px) {
          .app-shell {
            grid-template-columns: 200px 1fr;
          }
          .var-grid,
          .var-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .bottom-tab-bar {
            display: none !important;
          }
        }

        /* ════════════════════════════════════════════════════════════════════════
           SMALL TABLET (≤768px): sidebar hidden, stack layout, 2-col grids
           ════════════════════════════════════════════════════════════════════════ */
        @media (max-width: 768px) {
          .app-shell {
            grid-template-columns: 1fr !important;
            grid-template-areas: "header" "content" !important;
            grid-template-rows: var(--header-h) 1fr !important;
            padding-bottom: 64px;
          }
          .app-sidebar { display: none !important; }
          .app-header__center { display: none; }
          .app-header__status { display: none; }
          .page-content { 
            padding: 16px !important; 
            max-width: 100% !important;
          }

          .var-layout {
            grid-template-columns: 1fr;
          }
          .var-controls {
            position: static;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .var-controls__title {
            grid-column: 1 / -1;
          }
          .var-run-btn {
            grid-column: 1 / -1;
            margin-top: 0;
          }
          .var-grid,
          .var-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .bottom-tab-bar {
            display: flex !important;
            position: fixed;
            left: 0; right: 0; bottom: 0;
            z-index: 1000;
            background: var(--bg-surface);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-top: 1px solid var(--border-base);
            padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
            box-shadow: 0 -8px 24px rgba(0,0,0,0.15);
          }
          .bottom-tab-bar__item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 4px 0;
            color: var(--text-muted);
            text-decoration: none;
            transition: color 0.15s;
            font-size: 0.62rem;
            border: none;
            background: transparent;
            cursor: pointer;
          }
          .bottom-tab-bar__icon { 
            width: 20px; 
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .bottom-tab-bar__icon svg { 
            width: 100%; 
            height: 100%; 
          }
          .bottom-tab-bar__label { 
            font-size: 0.62rem; 
            font-weight: 500; 
            font-family: var(--font-mono);
          }
          .bottom-tab-bar__item.active { 
            color: var(--cyan); 
          }
        }

        /* ════════════════════════════════════════════════════════════════════════
           PHONE (≤480px): single column everything
           ════════════════════════════════════════════════════════════════════════ */
        @media (max-width: 480px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 12px;
          }
          .page-header__title {
            font-size: 1.15rem;
          }
          .sim-selector-bar {
            flex-wrap: wrap;
            gap: 8px;
            padding: 12px;
          }
          .sim-selector-bar .form-select {
            width: 100%;
            max-width: none !important;
            min-width: unset;
          }
          .sim-selector-bar .form-label {
            width: 100%;
          }
          .selector-meta {
            width: 100%;
            font-size: 0.72rem;
          }
          .var-controls {
            grid-template-columns: 1fr;
            padding: 14px;
          }
          .var-grid,
          .var-metrics-grid {
            grid-template-columns: 1fr;
          }
          .risk-metric-card {
            padding: 12px;
          }
          .risk-metric-card__value {
            font-size: 1.15rem;
          }
          .method-badges {
            gap: 6px;
          }
          .var-loading {
            min-height: 200px;
          }
          .btn-group .btn {
            padding: 4px 6px;
            font-size: 0.68rem;
          }
          .var-controls .form-group {
            margin-bottom: 0;
          }
        }

        /* ── Component styles (unchanged across breakpoints) ─────────────────── */
        .var-controls__title {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .var-run-btn {
          width: 100%;
          justify-content: center;
          margin-top: 8px;
        }
        .btn-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .btn-group .btn {
          flex: 1;
          justify-content: center;
          padding: 5px 4px;
          min-width: 0;
        }
        .var-results {
          display: flex;
          flex-direction: column;
          min-height: 400px;
        }
        .var-results__inner {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .var-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-xl);
          gap: 16px;
          text-align: center;
          padding: 24px;
        }
        .var-loading p {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin: 0;
        }
        .risk-metric-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-lg);
          padding: 16px;
          transition: border-color 0.18s, transform 0.18s;
        }
        .risk-metric-card:hover {
          border-color: var(--border-base);
          transform: translateY(-1px);
        }
        .risk-metric-card__label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          font-family: var(--font-mono);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .risk-metric-card__tooltip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--bg-elevated);
          border: 1px solid var(--border-base);
          font-size: 0.6rem;
          color: var(--text-muted);
          cursor: help;
        }
        .risk-metric-card__value {
          font-family: var(--font-mono);
          font-size: 1.4rem;
          font-weight: 500;
          color: var(--text-primary);
          margin-top: 4px;
        }
        .risk-metric-card__sub {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
          margin-top: 2px;
        }
        .method-selector {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .method-selector__label {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .method-selector__options {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .method-selector__option {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-md);
          padding: 8px 12px;
          text-align: left;
          font-size: 0.78rem;
          font-family: var(--font-mono);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          flex-direction: column;
        }
        .method-selector__option:hover {
          border-color: var(--border-base);
          color: var(--text-primary);
        }
        .method-selector__option.active {
          border-color: var(--cyan);
          color: var(--text-primary);
          background: rgba(0, 229, 204, 0.05);
        }
        .method-selector__desc {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 400;
        }
        .method-badges {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .method-desc {
          color: var(--text-muted);
          font-size: 0.78rem;
          margin-top: 8px;
          margin-bottom: 0;
          line-height: 1.5;
        }
        .selector-meta {
          font-size: 0.78rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .alert {
          padding: 12px 16px;
          border-radius: var(--r-lg);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          font-family: var(--font-mono);
        }
        .alert-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--red-bright);
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 240px;
          background: var(--bg-surface);
          border: 1px dashed var(--border-base);
          border-radius: var(--r-xl);
          padding: 40px 24px;
          text-align: center;
        }
        .empty-state__icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
          opacity: 0.7;
        }
        .empty-state h3 {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 6px 0;
        }
        .empty-state p {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0;
          max-width: 320px;
        }

        /* ── Form group ────────────────────────────────────────────────────────── */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group .form-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
      `}</style>
    </>
  );
};

export default VaRPage;