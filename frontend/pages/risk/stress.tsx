// frontend/pages/risk/stress.tsx — Fixed Mobile, Tablet & Desktop

import React, { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { usePortfolioList, usePortfolio } from "../../hooks/usePortfolio";
import { safeNumber, safeCurrency } from "../../utils/dataAdapter";

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

/* ─── Stress Scenario Card ──────────────────────────────────────────────── */
function ScenarioCard({
  scenario,
  isActive,
  onClick,
}: {
  scenario: any;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`scenario-card ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <div className="scenario-card__header">
        <span className="scenario-card__icon">{scenario.icon}</span>
        <span className="scenario-card__name">{scenario.name}</span>
      </div>
      <div className="scenario-card__desc">{scenario.description}</div>
      <div className="scenario-card__impact">
        <span className="scenario-card__impact-label">Est. Impact</span>
        <span className={`scenario-card__impact-value ${scenario.impact >= 0 ? "negative" : "positive"}`}>
          {scenario.impact >= 0 ? "-" : "+"}
          {Math.abs(scenario.impact).toFixed(1)}%
        </span>
      </div>
    </button>
  );
}

/* ─── Stress Test Result ────────────────────────────────────────────────── */
function StressResult({ portfolio, scenario, result }: any) {
  if (!result) return null;

  const totalValue = safeNumber(portfolio?.totalValue || 0);
  const lossAmount = safeNumber(result.lossAmount);
  const lossPct = safeNumber(result.lossPct);

  return (
    <div className="stress-result">
      <div className="stress-result__header">
        <h3>Scenario Impact Analysis</h3>
        <span className="badge badge-cyan">{scenario.name}</span>
      </div>

      <div className="stress-result__grid">
        <div className="stress-result__stat">
          <div className="stress-result__label">Portfolio Value</div>
          <div className="stress-result__value">{safeCurrency(totalValue)}</div>
        </div>
        <div className="stress-result__stat">
          <div className="stress-result__label">Estimated Loss</div>
          <div className="stress-result__value" style={{ color: lossAmount < 0 ? "var(--red-bright)" : "var(--green-bright)" }}>
            {lossAmount < 0 ? "-" : "+"}{safeCurrency(Math.abs(lossAmount))}
          </div>
        </div>
        <div className="stress-result__stat">
          <div className="stress-result__label">Loss Percentage</div>
          <div className="stress-result__value" style={{ color: lossPct < 0 ? "var(--red-bright)" : "var(--green-bright)" }}>
            {lossPct < 0 ? "-" : "+"}{Math.abs(lossPct).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Impact Chart */}
      {result.holdings && result.holdings.length > 0 && (
        <div className="stress-result__chart">
          <div className="card-title" style={{ marginBottom: 8 }}>Holding Impact</div>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.holdings} layout="vertical" margin={{ left: 0, right: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "var(--text-muted)", fontSize: 9, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="ticker"
                  tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-overlay)",
                    border: "1px solid var(--border-base)",
                    borderRadius: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                  formatter={(v: any) => [`${v}%`, "Impact"]}
                />
                <Bar
                  dataKey="impactPct"
                  fill="var(--red-bright)"
                  radius={[0, 3, 3, 0]}
                  maxBarSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stress Tests Page ────────────────────────────────────────────────── */
const StressPage: NextPage = () => {
  const { portfolios, isLoading: portfoliosLoading } = usePortfolioList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>("market_crash");
  const [result, setResult] = useState<any>(null);

  const { portfolio } = usePortfolio(selectedId);

  const scenarios = [
    {
      id: "market_crash",
      name: "Market Crash",
      icon: "📉",
      description: "Global equity market decline of 20-30%",
      impact: 25,
      parameters: { decline: 0.25, volatility: 2.5 },
    },
    {
      id: "rate_hike",
      name: "Rate Hike",
      icon: "📈",
      description: "Interest rates increase by 200-300 bps",
      impact: 15,
      parameters: { rateHike: 0.025, duration: 8 },
    },
    {
      id: "sector_shock",
      name: "Sector Shock",
      icon: "🏭",
      description: "Sector-specific disruption (e.g., tech, energy)",
      impact: 18,
      parameters: { sector: "technology", decline: 0.18 },
    },
    {
      id: "vol_spike",
      name: "Volatility Spike",
      icon: "⚡",
      description: "VIX spikes to 40+ with market dislocation",
      impact: 20,
      parameters: { vix: 45, correlation: 0.6 },
    },
    {
      id: "liquidity_crisis",
      name: "Liquidity Crisis",
      icon: "💧",
      description: "Sudden drying up of market liquidity",
      impact: 30,
      parameters: { spreadMultiplier: 3.0, depth: 0.4 },
    },
  ];

  const handleRunScenario = () => {
    const selected = scenarios.find(s => s.id === activeScenario);
    if (!selected || !portfolio) return;

    const totalValue = safeNumber(portfolio.totalValue || 0);
    const lossPct = -(selected.impact / 100);
    const lossAmount = totalValue * lossPct;

    const holdings = portfolio.holdings?.map((h: any) => ({
      ticker: h.ticker,
      impactPct: -(selected.impact / 100) * (0.7 + Math.random() * 0.6),
      name: h.name || h.ticker,
    })) || [];

    setResult({
      scenarioId: selected.id,
      lossAmount,
      lossPct,
      holdings: holdings.slice(0, 8),
    });
  };

  const selectedScenario = scenarios.find(s => s.id === activeScenario);
  const selectedPortfolio = portfolios.find((p) => p.id === selectedId);

  return (
    <>
      <Head><title>Stress Tests — RiskLens</title></Head>
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
          <Link href="/risk/var" className="sidebar-item">VaR / CVaR</Link>
          <Link href="/risk/stress" className="sidebar-item active">
            <svg className="sidebar-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Stress Tests
          </Link>

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
              <h1 className="page-header__title">Stress Tests</h1>
              <p className="page-header__sub">
                Simulate extreme market scenarios to assess portfolio vulnerability
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
                onChange={(e) => {
                  setSelectedId(e.target.value || null);
                  setResult(null);
                }}
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
                {selectedPortfolio.holdingCount || 0} holdings
              </span>
            )}
          </div>

          {!selectedId ? (
            <div className="empty-state" style={{ marginTop: 24 }}>
              <div className="empty-state__icon">📊</div>
              <h3>Select a portfolio to test</h3>
              <p>Choose a portfolio above to run stress tests.</p>
            </div>
          ) : (
            <div className="stress-layout">
              {/* Scenarios */}
              <aside className="stress-scenarios">
                <div className="stress-scenarios__title">Scenarios</div>
                <div className="stress-scenarios__list">
                  {scenarios.map((s) => (
                    <ScenarioCard
                      key={s.id}
                      scenario={s}
                      isActive={activeScenario === s.id}
                      onClick={() => {
                        setActiveScenario(s.id);
                        setResult(null);
                      }}
                    />
                  ))}
                </div>
                <button
                  className="btn btn-primary stress-run-btn"
                  onClick={handleRunScenario}
                >
                  ▶ Run Scenario
                </button>
              </aside>

              {/* Results */}
              <div className="stress-results">
                {result ? (
                  <StressResult
                    portfolio={portfolio}
                    scenario={selectedScenario}
                    result={result}
                  />
                ) : (
                  <div className="stress-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.25">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <p>Select a scenario and click <span style={{ color: "var(--cyan)" }}>Run Scenario</span></p>
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
          --green-bright: #69db7c;
          --bg-app: #08090e;
          --bg-surface: #0d0f16;
          --bg-elevated: #141824;
          --bg-overlay: rgba(13, 15, 22, 0.92);
          --text-primary: #f0f4f8;
          --text-secondary: #b0b8c8;
          --text-muted: #6a7288;
          --border-base: #2a2f3f;
          --border-subtle: #1a1f2e;
          --bg-surface-hover: #1c2230;
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

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid var(--border-subtle);
          border-top-color: var(--cyan);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* ── Badge ────────────────────────────────────────────────────────────── */
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

        /* ── Card title ────────────────────────────────────────────────────────── */
        .card-title {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }

        /* ── Animations ────────────────────────────────────────────────────────── */
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

        /* ── Empty state ──────────────────────────────────────────────────────── */
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

        /* ── Selector meta ────────────────────────────────────────────────────── */
        .selector-meta {
          font-size: 0.78rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        /* ════════════════════════════════════════════════════════════════════════
           STRESS LAYOUT - Desktop default
           ════════════════════════════════════════════════════════════════════════ */
        .stress-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 16px;
          align-items: start;
        }

        .stress-scenarios {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-xl);
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: sticky;
          top: calc(var(--header-h) + 16px);
        }
        .stress-scenarios__title {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          font-family: var(--font-mono);
          margin-bottom: 6px;
        }
        .stress-scenarios__list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .stress-run-btn {
          width: 100%;
          justify-content: center;
          margin-top: 12px;
        }

        /* ── Scenario cards ──────────────────────────────────────────────── */
        .scenario-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-md);
          padding: 10px 14px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          flex-direction: column;
          gap: 2px;
          width: 100%;
          font-family: inherit;
          color: inherit;
        }
        .scenario-card:hover {
          border-color: var(--border-base);
        }
        .scenario-card.active {
          border-color: var(--cyan);
          background: rgba(0, 229, 204, 0.05);
        }
        .scenario-card__header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .scenario-card__icon { font-size: 1.1rem; }
        .scenario-card__name {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-primary);
        }
        .scenario-card__desc {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-left: 28px;
        }
        .scenario-card__impact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
          padding-top: 4px;
          border-top: 1px solid var(--border-subtle);
        }
        .scenario-card__impact-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .scenario-card__impact-value {
          font-family: var(--font-mono);
          font-size: 0.82rem;
          font-weight: 600;
        }
        .scenario-card__impact-value.negative { color: var(--red-bright); }
        .scenario-card__impact-value.positive { color: var(--green-bright); }

        /* ── Results area ──────────────────────────────────────────────────── */
        .stress-results {
          display: flex;
          flex-direction: column;
          min-height: 400px;
        }
        .stress-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          background: var(--bg-surface);
          border: 1px dashed var(--border-base);
          border-radius: var(--r-xl);
          padding: 24px;
          text-align: center;
        }
        .stress-placeholder p {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin-top: 12px;
        }

        /* ── Result card ───────────────────────────────────────────────────── */
        .stress-result {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-xl);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .stress-result__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .stress-result__header h3 {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
          color: var(--text-primary);
        }
        .stress-result__grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .stress-result__stat {
          background: var(--bg-elevated);
          padding: 12px 16px;
          border-radius: var(--r-md);
        }
        .stress-result__label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .stress-result__value {
          font-family: var(--font-mono);
          font-size: 1.1rem;
          font-weight: 500;
          margin-top: 2px;
          color: var(--text-primary);
        }
        .stress-result__chart {
          margin-top: 4px;
        }

        /* ── Bottom tab bar (hidden on desktop) ───────────────────────────── */
        .bottom-tab-bar {
          display: none !important;
        }

        /* ════════════════════════════════════════════════════════════════════════
           TABLET (769px – 1024px): sidebar visible, 2-col scenarios
           ════════════════════════════════════════════════════════════════════════ */
        @media (max-width: 1024px) and (min-width: 769px) {
          .app-shell {
            grid-template-columns: 200px 1fr;
          }
          .stress-layout {
            grid-template-columns: 1fr;
          }
          .stress-scenarios {
            position: static;
          }
          .stress-scenarios__list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .stress-result__grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .bottom-tab-bar {
            display: none !important;
          }
        }

        /* ════════════════════════════════════════════════════════════════════════
           SMALL TABLET & MOBILE (≤768px): sidebar hidden, bottom nav visible
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

          .stress-layout {
            grid-template-columns: 1fr;
          }
          .stress-scenarios {
            position: static;
          }
          .stress-scenarios__list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .stress-result__grid {
            grid-template-columns: repeat(3, 1fr);
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

          .stress-scenarios {
            padding: 14px;
          }
          .stress-scenarios__list {
            grid-template-columns: 1fr;
          }
          .stress-result {
            padding: 14px;
          }
          .stress-result__grid {
            grid-template-columns: 1fr;
          }
          .stress-result__stat {
            padding: 10px 12px;
          }
          .stress-result__value {
            font-size: 1rem;
          }
          .stress-placeholder {
            min-height: 200px;
          }
          .scenario-card {
            padding: 8px 12px;
          }
        }
      `}</style>
    </>
  );
};

export default StressPage;