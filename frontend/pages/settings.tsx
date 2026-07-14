// frontend/pages/settings.tsx — Fixed Mobile, Tablet & Desktop

import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { simulationApi } from "../services/simulationApi";

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

/* ─── Setting Row ───────────────────────────────────────────────────────── */
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      <div className="setting-row__info">
        <div className="setting-row__label">{label}</div>
        {description && <div className="setting-row__description">{description}</div>}
      </div>
      <div className="setting-row__control">{children}</div>
    </div>
  );
}

/* ─── Loading state ────────────────────────────────────────────────────── */
function SettingsLoading() {
  return (
    <div className="settings-container">
      <div className="settings-section">
        <div className="settings-section__title">Loading Settings...</div>
        <div className="settings-loading__spinner">
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Settings Page ────────────────────────────────────────────────────── */
const SettingsPage: NextPage = () => {
  const [defaults, setDefaults] = useState<{
    num_simulations: number;
    max_simulations: number;
    time_horizon: number;
    confidence_level: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  const [defaultSims, setDefaultSims] = useState(5000);
  const [defaultHorizon, setDefaultHorizon] = useState(252);
  const [defaultConfidence, setDefaultConfidence] = useState(0.95);
  const [defaultMethod, setDefaultMethod] = useState("historical");

  useEffect(() => {
    simulationApi.getDefaults()
      .then((d) => {
        setDefaults(d);
        setDefaultSims(d.num_simulations || 5000);
        setDefaultHorizon(d.time_horizon || 252);
        setDefaultConfidence(d.confidence_level || 0.95);
        setLoading(false);
      })
      .catch(() => {
        setDefaults({
          num_simulations: 5000,
          max_simulations: 100000,
          time_horizon: 252,
          confidence_level: 0.95,
        });
        setLoading(false);
      });
  }, []);

  const formatNumber = (value: number | undefined | null): string => {
    if (value == null || !Number.isFinite(value)) return "—";
    return value.toLocaleString();
  };

  if (loading) {
    return (
      <>
        <Head><title>Settings — RiskLens</title></Head>
        <div className="app-shell">
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
              <div className="app-header__portfolio-name">Settings</div>
            </div>
            <div className="app-header__right">
              <div className="app-header__status">
                <div className="status-dot" />
                Live
              </div>
            </div>
          </header>
          <aside className="app-sidebar">
            <div className="sidebar-section">Main</div>
            <Link href="/" className="sidebar-item">Dashboard</Link>
            <Link href="/portfolio" className="sidebar-item">Portfolios</Link>
            <Link href="/simulation" className="sidebar-item">Simulation</Link>

            <div className="sidebar-section" style={{ marginTop: 8 }}>Risk</div>
            <Link href="/risk/var" className="sidebar-item">VaR / CVaR</Link>
            <Link href="/risk/stress" className="sidebar-item">Stress Tests</Link>

            <div className="sidebar-section" style={{ marginTop: 8 }}>Settings</div>
            <Link href="/settings" className="sidebar-item active">
              <svg className="sidebar-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
              </svg>
              Preferences
            </Link>
          </aside>
          <main className="page-content animate-in">
            <div className="page-header">
              <div>
                <h1 className="page-header__title">Preferences</h1>
                <p className="page-header__sub">Loading settings...</p>
              </div>
            </div>
            <SettingsLoading />
          </main>
        </div>
        <BottomTabBar active="settings" />
      </>
    );
  }

  return (
    <>
      <Head><title>Settings — RiskLens</title></Head>
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
            <div className="app-header__portfolio-name">Settings</div>
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
          <Link href="/risk/stress" className="sidebar-item">Stress Tests</Link>

          <div className="sidebar-section" style={{ marginTop: 8 }}>Settings</div>
          <Link href="/settings" className="sidebar-item active">
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
              <h1 className="page-header__title">Preferences</h1>
              <p className="page-header__sub">
                Configure default settings for risk analysis and simulation
              </p>
            </div>
          </div>

          <div className="settings-container">
            {/* Simulation Settings */}
            <div className="settings-section">
              <div className="settings-section__title">Simulation Defaults</div>
              <div className="settings-section__desc">
                Default values used for Monte Carlo simulations
              </div>

              <SettingRow
                label="Default Simulations"
                description="Number of simulation paths to run by default"
              >
                <select
                  className="form-select"
                  value={defaultSims}
                  onChange={(e) => setDefaultSims(Number(e.target.value))}
                >
                  <option value={1000}>1,000 paths</option>
                  <option value={5000}>5,000 paths</option>
                  <option value={10000}>10,000 paths</option>
                  <option value={50000}>50,000 paths</option>
                </select>
              </SettingRow>

              <SettingRow
                label="Time Horizon"
                description="Default forecast period in trading days"
              >
                <select
                  className="form-select"
                  value={defaultHorizon}
                  onChange={(e) => setDefaultHorizon(Number(e.target.value))}
                >
                  <option value={21}>1 Month (21 days)</option>
                  <option value={63}>3 Months (63 days)</option>
                  <option value={126}>6 Months (126 days)</option>
                  <option value={252}>1 Year (252 days)</option>
                </select>
              </SettingRow>

              <SettingRow
                label="Confidence Level"
                description="Default confidence interval for VaR/CVaR"
              >
                <div className="btn-group">
                  {[0.90, 0.95, 0.99].map((c) => (
                    <button
                      key={c}
                      className={`btn btn-sm ${defaultConfidence === c ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setDefaultConfidence(c)}
                    >
                      {(c * 100).toFixed(0)}%
                    </button>
                  ))}
                </div>
              </SettingRow>
            </div>

            {/* Risk Settings */}
            <div className="settings-section">
              <div className="settings-section__title">Risk Analysis</div>
              <div className="settings-section__desc">
                Default risk calculation settings
              </div>

              <SettingRow
                label="VaR Method"
                description="Default method for VaR calculation"
              >
                <select
                  className="form-select"
                  value={defaultMethod}
                  onChange={(e) => setDefaultMethod(e.target.value)}
                >
                  <option value="historical">Historical Simulation</option>
                  <option value="parametric">Parametric (EWMA)</option>
                </select>
              </SettingRow>

              <SettingRow
                label="Lookback Period"
                description="Historical data window for risk calculation"
              >
                <select className="form-select" defaultValue="252">
                  <option value={63}>3 Months (63 days)</option>
                  <option value={126}>6 Months (126 days)</option>
                  <option value={252}>1 Year (252 days)</option>
                  <option value={504}>2 Years (504 days)</option>
                </select>
              </SettingRow>
            </div>

            {/* Display Settings */}
            <div className="settings-section">
              <div className="settings-section__title">Display</div>
              <div className="settings-section__desc">
                UI preferences and display options
              </div>

              <SettingRow
                label="Currency Display"
                description="Default currency for all values"
              >
                <select className="form-select" defaultValue="USD">
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                  <option>INR</option>
                </select>
              </SettingRow>

              <SettingRow
                label="Dark Mode"
                description="Switch between light and dark theme"
              >
                <div className="btn-group">
                  <button className="btn btn-secondary btn-sm">Light</button>
                  <button className="btn btn-primary btn-sm">Dark</button>
                  <button className="btn btn-secondary btn-sm">System</button>
                </div>
              </SettingRow>
            </div>

            {/* System Info */}
            <div className="settings-section">
              <div className="settings-section__title">System</div>
              <div className="settings-section__desc">
                Application information and defaults
              </div>

              {defaults && (
                <>
                  <SettingRow
                    label="Max Simulations"
                    description="Maximum allowed simulation paths"
                  >
                    <span className="badge badge-neutral">{formatNumber(defaults.max_simulations)}</span>
                  </SettingRow>
                  <SettingRow
                    label="Default Simulations"
                    description="Server-side default"
                  >
                    <span className="badge badge-neutral">{formatNumber(defaults.num_simulations)}</span>
                  </SettingRow>
                  <SettingRow
                    label="Default Horizon"
                    description="Server-side default"
                  >
                    <span className="badge badge-neutral">{defaults.time_horizon || "—"} days</span>
                  </SettingRow>
                  <SettingRow
                    label="API Status"
                    description="Backend service status"
                  >
                    <span className="badge badge-green">● Online</span>
                  </SettingRow>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="settings-actions">
              <button className="btn btn-primary">Save Settings</button>
              <button className="btn btn-secondary">Reset to Defaults</button>
            </div>
          </div>
        </main>
      </div>

      <BottomTabBar active="settings" />

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
          --bg-surface-hover: #1c2230;
          --text-primary: #f0f4f8;
          --text-secondary: #b0b8c8;
          --text-muted: #6a7288;
          --border-base: #2a2f3f;
          --border-subtle: #1a1f2e;
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

        /* ── Form elements ────────────────────────────────────────────────────── */
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
          width: 100%;
        }
        .form-select:focus {
          border-color: var(--cyan);
        }

        /* ── Badges ────────────────────────────────────────────────────────────── */
        .badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.68rem;
          font-family: var(--font-mono);
          font-weight: 500;
          border: 1px solid var(--border-subtle);
        }
        .badge-neutral {
          background: var(--bg-elevated);
          color: var(--text-muted);
        }
        .badge-green {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.2);
          color: var(--green-bright);
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

        /* ── Container ──────────────────────────────────────────────────────── */
        .settings-container {
          max-width: 720px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* ── Section cards ──────────────────────────────────────────────────── */
        .settings-section {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-xl);
          padding: 20px;
        }
        .settings-section__title {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--text-primary);
        }
        .settings-section__desc {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin-top: 2px;
          margin-bottom: 12px;
        }

        /* ── Setting row ────────────────────────────────────────────────────── */
        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--border-subtle);
        }
        .setting-row:last-child {
          border-bottom: none;
        }
        .setting-row__info {
          flex: 1;
          margin-right: 16px;
          min-width: 0;
        }
        .setting-row__label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .setting-row__description {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-top: 1px;
        }
        .setting-row__control {
          flex-shrink: 0;
          min-width: 160px;
        }

        /* ── Button group ───────────────────────────────────────────────────── */
        .btn-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .btn-group .btn {
          flex: 1;
          justify-content: center;
          min-width: 0;
        }

        /* ── Actions bar ────────────────────────────────────────────────────── */
        .settings-actions {
          display: flex;
          gap: 8px;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
        }

        /* ── Loading spinner container ──────────────────────────────────────── */
        .settings-loading__spinner {
          display: flex;
          justify-content: center;
          padding: 40px 0;
        }

        /* ── Bottom tab bar (hidden on desktop) ───────────────────────────── */
        .bottom-tab-bar {
          display: none !important;
        }

        /* ════════════════════════════════════════════════════════════════════════
           TABLET (769px – 1024px): sidebar visible, wider container
           ════════════════════════════════════════════════════════════════════════ */
        @media (max-width: 1024px) and (min-width: 769px) {
          .app-shell {
            grid-template-columns: 200px 1fr;
          }
          .settings-container {
            max-width: 100%;
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
          .settings-container {
            max-width: 100%;
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
           SMALL TABLET (≤640px): stack setting rows
           ════════════════════════════════════════════════════════════════════════ */
        @media (max-width: 640px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 12px;
          }
          .page-header__title {
            font-size: 1.15rem;
          }

          .setting-row {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
            padding: 14px 0;
          }
          .setting-row__info {
            margin-right: 0;
          }
          .setting-row__control {
            min-width: unset;
            width: 100%;
          }
          .setting-row__control .form-select,
          .setting-row__control .btn-group {
            width: 100%;
          }
          .setting-row__control .btn-group .btn {
            flex: 1;
          }
          .settings-section {
            padding: 16px;
          }
          .settings-actions {
            flex-direction: column;
          }
          .settings-actions .btn {
            width: 100%;
            justify-content: center;
          }
        }

        /* ════════════════════════════════════════════════════════════════════════
           PHONE (≤480px): tighter padding
           ════════════════════════════════════════════════════════════════════════ */
        @media (max-width: 480px) {
          .settings-section {
            padding: 14px;
            border-radius: var(--r-lg);
          }
          .settings-section__title {
            font-size: 0.9rem;
          }
          .setting-row__label {
            font-size: 0.82rem;
          }
          .setting-row__description {
            font-size: 0.7rem;
          }
          .setting-row {
            padding: 12px 0;
          }
          .btn-sm {
            padding: 4px 8px;
            font-size: 0.68rem;
          }
        }
      `}</style>
    </>
  );
};

export default SettingsPage;