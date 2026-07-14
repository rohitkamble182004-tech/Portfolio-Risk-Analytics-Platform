// frontend/pages/simulation.tsx - Updated with consistent sidebar and bottom tab nav

import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { usePortfolio, usePortfolioList } from "../hooks/usePortfolio";
import { useSimulation } from "../hooks/useSimulation";
import { simulationApi } from "../services/simulationApi";
import { safeNumber } from "../utils/dataAdapter";
// import "../styles/globals.css";

type NavKey = "dashboard" | "portfolio" | "simulation" | "risk" | "settings";

/* ─── Icons (shared between sidebar + bottom tab bar) ───────────────────── */
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

/* ─── Bottom tab bar (mobile only, ≤720px) ──────────────────────────────── */
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

/* ─── Custom tooltip ────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-overlay)",
        border: "1px solid var(--border-base)",
        borderRadius: 8,
        padding: "10px 14px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Day {label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" }).format(p.value)}
        </div>
      ))}
    </div>
  );
}

/* ─── Paths fan chart from pathsSample ────────────────────────────────── */
function PathsFanChart({ pathsSample, initialValue }: { pathsSample: number[][]; initialValue: number }) {
  if (!pathsSample || pathsSample.length === 0) {
    return (
      <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        No path data available
      </div>
    );
  }

  const numPaths = pathsSample.length;
  const numDays = pathsSample[0]?.length || 0;

  if (numDays === 0) {
    return (
      <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        No path data available
      </div>
    );
  }

  const step = Math.max(1, Math.floor(numDays / 60));

  const data = Array.from({ length: Math.ceil(numDays / step) }, (_, i) => {
    const t = i * step;
    const idx = Math.min(t, numDays - 1);
    
    const valuesAtDay = pathsSample.map(path => path[idx]).filter(v => v !== undefined && v !== null && Number.isFinite(v));
    
    if (valuesAtDay.length === 0) {
      return { day: t, p5: null, p25: null, p50: null, p75: null, p95: null };
    }

    const sorted = [...valuesAtDay].sort((a, b) => a - b);
    
    const p5 = sorted[Math.floor(0.05 * sorted.length)];
    const p25 = sorted[Math.floor(0.25 * sorted.length)];
    const p50 = sorted[Math.floor(0.50 * sorted.length)];
    const p75 = sorted[Math.floor(0.75 * sorted.length)];
    const p95 = sorted[Math.floor(0.95 * sorted.length)];

    return { day: t, p5, p25, p50, p75, p95 };
  });

  const fmtK = (v: number) => {
    if (!v || !Number.isFinite(v)) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
  };

  return (
    <div className="chart-container" style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="gradP95" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--cyan)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "DM Mono" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `D${v}`}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "DM Mono" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtK}
            width={68}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine
            y={initialValue || 0}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="4 4"
            label={{ value: "Initial", fill: "var(--text-muted)", fontSize: 10 }}
          />
          <Area type="monotone" dataKey="p95" name="P95" stroke="var(--cyan)" strokeWidth={1} fill="url(#gradP95)" dot={false} strokeDasharray="4 4" />
          <Area type="monotone" dataKey="p75" name="P75" stroke="var(--cyan)" strokeWidth={1.5} fill="rgba(0,229,204,0.05)" dot={false} />
          <Area type="monotone" dataKey="p50" name="P50 (Median)" stroke="var(--cyan)" strokeWidth={2.5} fill="none" dot={false} />
          <Area type="monotone" dataKey="p25" name="P25" stroke="var(--red-bright)" strokeWidth={1.5} fill="none" dot={false} />
          <Area type="monotone" dataKey="p5" name="P5" stroke="var(--red-bright)" strokeWidth={1} fill="none" dot={false} strokeDasharray="4 4" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Result stat block ─────────────────────────────────────────────────── */
function SimStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--r-lg)", padding: "14px 16px" }}>
      <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: 500, color: accent || "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

/* ─── Simulation page ───────────────────────────────────────────────────── */
const SimulationPage: NextPage = () => {
  const router = useRouter();
  const initialId = (router.query.portfolioId as string) ?? null;

  const { portfolios, isLoading: portfoliosLoading } = usePortfolioList();
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  
  const [numSims, setNumSims] = useState<number>(5000);
  const [horizonDays, setHorizonDays] = useState<number>(252);
  const [confidence, setConfidence] = useState<number>(0.95);
  const [loadingDefaults, setLoadingDefaults] = useState<boolean>(true);

  const { results, isRunning, error, runSimulation, reset } = useSimulation(selectedId);
  const { portfolio } = usePortfolio(selectedId);

  useEffect(() => {
    simulationApi.getDefaults()
      .then((d) => {
        setNumSims(d.num_simulations || 5000);
        setHorizonDays(d.time_horizon || 252);
        setConfidence(d.confidence_level || 0.95);
        setLoadingDefaults(false);
      })
      .catch(() => {
        setLoadingDefaults(false);
      });
  }, []);

  const selectedPortfolio = portfolios.find((p) => p.id === selectedId);

  const totalMarketValue =
    portfolio?.holdings?.reduce(
      (s, h) => s + (h.marketValue || 0),
      0
    ) ?? 0;

  const positions =
    portfolio?.holdings
      ?.map((h) => ({
        symbol: h.ticker,
        weight:
          totalMarketValue > 0
            ? (h.marketValue || 0) / totalMarketValue
            : 0,
        marketValue: h.marketValue || 0,
      }))
      .filter(
        (p) =>
          Number.isFinite(p.weight) &&
          p.weight > 0 &&
          Number.isFinite(p.marketValue) &&
          p.marketValue > 0
      ) ?? [];

  const fmtC = (n: number) => {
    if (n == null || !Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(n);
  };

  const handleRun = () => {
    if (!selectedId || !positions.length) {
      alert("Add holdings first.");
      return;
    }

    const cleanPositions = positions.filter(
      (p) =>
        Number.isFinite(p.weight) &&
        p.weight > 0,
    );

    const portfolioValue = totalMarketValue > 0 ? totalMarketValue : 100000;

    runSimulation(
      {
        numSimulations: numSims,
        horizonDays,
        confidenceLevel: confidence,
      },
      cleanPositions,
      portfolioValue,
    );
  };

  if (loadingDefaults) {
    return (
      <>
        <Head><title>Simulation — RiskLens</title></Head>
        <div className="app-shell">
          <header className="app-header">
            <Link href="/" className="app-header__brand">
              <div className="app-header__brand-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#02030a" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              </div>
              RiskLens
            </Link>
          </header>
          <aside className="app-sidebar">
            <Link href="/" className="sidebar-item">Dashboard</Link>
            <Link href="/portfolio" className="sidebar-item">Portfolios</Link>
            <Link href="/simulation" className="sidebar-item active">Simulation</Link>
          </aside>
          <main className="page-content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>Simulation — RiskLens</title></Head>
      <div className="app-shell">
        <header className="app-header">
          <Link href="/" className="app-header__brand">
            <div className="app-header__brand-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#02030a" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
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

        <aside className="app-sidebar">
          <div className="sidebar-section">Main</div>
          <Link href="/" className="sidebar-item">
            <span className="sidebar-item__icon">{ICONS.dashboard}</span>
            Dashboard
          </Link>
          <Link href="/portfolio" className="sidebar-item">
            <span className="sidebar-item__icon">{ICONS.portfolio}</span>
            Portfolios
          </Link>
          <Link href="/simulation" className="sidebar-item active">
            <span className="sidebar-item__icon">{ICONS.simulation}</span>
            Simulation
          </Link>

          <div className="sidebar-section" style={{ marginTop: 8 }}>Risk</div>
          <Link href="/risk/var" className="sidebar-item">
            <span className="sidebar-item__icon">{ICONS.risk}</span>
            VaR / CVaR
          </Link>
          <Link href="/risk/stress" className="sidebar-item">
            <svg className="sidebar-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Stress Tests
          </Link>

          <div className="sidebar-section" style={{ marginTop: 8 }}>Settings</div>
          <Link href="/settings" className="sidebar-item">
            <span className="sidebar-item__icon">{ICONS.settings}</span>
            Preferences
          </Link>
        </aside>

        <main className="page-content animate-in">
          <div className="page-header">
            <div>
              <h1 className="page-header__title">Monte Carlo Simulation</h1>
              <p className="page-header__sub">
                Model thousands of future portfolio trajectories using GBM
              </p>
            </div>
          </div>

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
                  reset();
                }}
              >
                <option value="">— Select portfolio —</option>
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({fmtC(p.totalValue)})
                  </option>
                ))}
              </select>
            )}
            {selectedPortfolio && (
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {selectedPortfolio.holdingCount} holdings · {fmtC(totalMarketValue)}
              </span>
            )}
          </div>

          {!selectedId ? (
            <div className="empty-state" style={{ marginTop: 24 }}>
              <div className="empty-state__icon">📊</div>
              <h3>Select a portfolio to begin</h3>
              <p>Choose a portfolio above, configure parameters, and run the simulation.</p>
            </div>
          ) : (
            <div className="sim-layout">
              <aside className="sim-controls">
                <div className="sim-controls__title">Parameters</div>

                <div className="form-group">
                  <label className="form-label">Simulations</label>
                  <select
                    className="form-select"
                    value={numSims}
                    onChange={(e) => setNumSims(Number(e.target.value))}
                    disabled={isRunning}
                  >
                    <option value={1000}>1,000 paths</option>
                    <option value={5000}>5,000 paths</option>
                    <option value={10000}>10,000 paths</option>
                    <option value={50000}>50,000 paths</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Horizon (trading days)</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[21, 63, 126, 252].map((d) => (
                      <button
                        key={d}
                        className={`btn btn-sm ${horizonDays === d ? "btn-primary" : "btn-secondary"}`}
                        style={{ flex: 1, justifyContent: "center", padding: "5px 4px" }}
                        onClick={() => setHorizonDays(d)}
                        disabled={isRunning}
                      >
                        {d === 21 ? "1M" : d === 63 ? "3M" : d === 126 ? "6M" : "1Y"}
                      </button>
                    ))}
                  </div>
                  <input
                    className="form-input"
                    type="number"
                    value={horizonDays}
                    min={1}
                    max={1260}
                    onChange={(e) => setHorizonDays(Number(e.target.value))}
                    disabled={isRunning}
                    style={{ marginTop: 4 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confidence Level</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[0.90, 0.95, 0.99].map((c) => (
                      <button
                        key={c}
                        className={`btn btn-sm ${confidence === c ? "btn-primary" : "btn-secondary"}`}
                        style={{ flex: 1, justifyContent: "center", padding: "5px 4px" }}
                        onClick={() => setConfidence(c)}
                        disabled={isRunning}
                      >
                        {(c * 100).toFixed(0)}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sep" />

                {isRunning ? (
                  <button
                    className="btn btn-danger"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={reset}
                  >
                    ✕ Cancel
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={handleRun}
                  >
                    ▶ Run Simulation
                  </button>
                )}

                {results && !isRunning && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
                    onClick={reset}
                  >
                    ↺ Reset
                  </button>
                )}
              </aside>

              <div className="sim-results">
                {error && (
                  <div className="alert alert-error animate-in" style={{ marginBottom: 14 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    {error}
                  </div>
                )}

                {isRunning && (
                  <div className="sim-running animate-in">
                    <div className="sim-running__dots">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="sim-running__dot"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                      Running {numSims?.toLocaleString() || "5,000"} simulations…
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}>
                      This may take a few seconds
                    </p>
                  </div>
                )}

                {!results && !isRunning && !error && (
                  <div className="sim-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.25">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 12 }}>
                      Configure parameters and click{" "}
                      <span style={{ color: "var(--cyan)" }}>Run Simulation</span>
                    </p>
                  </div>
                )}

                {results && !isRunning && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="animate-in">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                      <SimStat 
                        label="Expected Value" 
                        value={results.expectedFinalValue != null && Number.isFinite(results.expectedFinalValue) ? fmtC(results.expectedFinalValue) : "—"} 
                        accent="var(--cyan)" 
                      />
                      <SimStat 
                        label="Median Value" 
                        value={results.finalValues?.p50 != null && Number.isFinite(results.finalValues.p50) ? fmtC(results.finalValues.p50) : "—"} 
                      />
                      <SimStat
                        label={`VaR ${(confidence * 100).toFixed(0)}%`}
                        value={results.varDollar != null && Number.isFinite(results.varDollar) ? `-${fmtC(results.varDollar)}` : "—"}
                        accent="var(--red-bright)"
                      />
                      <SimStat
                        label="P5 Outcome"
                        value={results.finalValues?.p5 != null && Number.isFinite(results.finalValues.p5) ? fmtC(results.finalValues.p5) : "—"}
                        accent="var(--red-bright)"
                      />
                      <SimStat
                        label="P95 Outcome"
                        value={results.finalValues?.p95 != null && Number.isFinite(results.finalValues.p95) ? fmtC(results.finalValues.p95) : "—"}
                        accent="var(--green-bright)"
                      />
                      <SimStat
                        label="Prob. of Loss"
                        value={results.probabilityOfLoss != null && Number.isFinite(results.probabilityOfLoss) ? `${(results.probabilityOfLoss * 100).toFixed(1)}%` : "—"}
                        accent={results.probabilityOfLoss != null && results.probabilityOfLoss > 0.2 ? "var(--red-bright)" : "var(--yellow-bright)"}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span className="badge badge-neutral">{results.numSimulations?.toLocaleString() || "0"} paths</span>
                      <span className="badge badge-neutral">{results.timeHorizon || 0}d horizon</span>
                      <span className="badge badge-neutral">GBM</span>
                    </div>

                    <div className="card" style={{ padding: 16 }}>
                      <div className="card-title">Portfolio Path Percentiles</div>
                      <PathsFanChart 
                        pathsSample={results.pathsSample || []} 
                        initialValue={results.initialValue || 0}
                      />
                      <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                        {[
                          { label: "P95", color: "var(--cyan)", dash: true },
                          { label: "P75", color: "var(--cyan)", dash: false },
                          { label: "P50 (Median)", color: "var(--cyan)", bold: true },
                          { label: "P25", color: "var(--red-bright)", dash: false },
                          { label: "P5", color: "var(--red-bright)", dash: true },
                        ].map((l) => (
                          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem" }}>
                            <div style={{ width: 20, height: 1.5, background: l.color, opacity: l.dash ? 0.5 : 1 }} />
                            <span style={{ color: "var(--text-muted)" }}>{l.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <BottomTabBar active="simulation" />

      <style dangerouslySetInnerHTML={{
        __html: `
          .app-shell {
            display: grid;
            grid-template-columns: 200px 1fr;
            grid-template-areas: "sidebar header" "sidebar content";
            min-height: 100vh;
            gap: 0;
          }
          .app-header { grid-area: header; }
          .app-sidebar { grid-area: sidebar; }
          .page-content { grid-area: content; }

          .sim-selector-bar {
            display: flex;
            align-items: center;
            gap: 14px;
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: var(--r-xl);
            padding: 12px 18px;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }

          .sim-layout {
            display: grid;
            grid-template-columns: 270px 1fr;
            gap: 14px;
            align-items: start;
          }

          .sim-controls {
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
          .sim-controls__title {
            font-size: 0.68rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-muted);
            font-family: var(--font-mono);
          }

          .sim-results {
            display: flex;
            flex-direction: column;
            min-height: 400px;
          }

          .sim-running {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: var(--r-xl);
            gap: 12px;
            text-align: center;
          }
          .sim-running__dots { display: flex; gap: 6px; }
          .sim-running__dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--cyan);
            animation: dotBounce 0.8s ease-in-out infinite alternate;
          }
          @keyframes dotBounce {
            from { transform: translateY(0); opacity: 0.3; }
            to   { transform: translateY(-10px); opacity: 1; }
          }

          .sim-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            background: var(--bg-surface);
            border: 1px dashed var(--border-base);
            border-radius: var(--r-xl);
          }

          /* ── Bottom tab bar: hidden by default (desktop/tablet) ──────────── */
          .bottom-tab-bar {
            display: none;
          }

          /* Tablet (721px–1024px): sidebar stays, grids condense */
          @media (max-width: 1024px) {
            .stat-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 10px !important;
            }
          }
          @media (max-width: 1024px) and (min-width: 721px) {
            .app-shell {
              grid-template-columns: 168px 1fr;
            }
            .sidebar-item span:last-child,
            .sidebar-section {
              font-size: 0.72rem;
            }
          }

          /* Mobile/tablet (≤900px): sidebar hidden, bottom tab bar takes over */
          @media (max-width: 900px) {
            .app-shell {
              grid-template-columns: 1fr !important;
              grid-template-areas: "header" "content" !important;
              padding-bottom: 64px;
            }

            .app-sidebar { display: none !important; }

            .app-header__center { display: none; }
            .app-header__status { display: none; }

            .page-content { padding: 16px !important; }

            .sim-layout {
              grid-template-columns: 1fr;
            }
            .sim-controls {
              position: static;
            }

            .bottom-tab-bar {
              display: flex;
              position: fixed;
              left: 0;
              right: 0;
              bottom: 0;
              z-index: 1000;
              background: var(--bg-overlay);
              border-top: 1px solid var(--border-base);
              padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
              box-shadow: 0 -8px 24px rgba(0,0,0,0.35);
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
            }
            .bottom-tab-bar__icon { width: 20px; height: 20px; }
            .bottom-tab-bar__icon svg { width: 100%; height: 100%; }
            .bottom-tab-bar__label { font-size: 0.62rem; font-weight: 500; }
            .bottom-tab-bar__item.active { color: var(--cyan); }
          }

          /* Small tablet / large phone (≤768px) */
          @media (max-width: 768px) {
            .sim-selector-bar {
              flex-direction: column;
              align-items: stretch;
            }
            .sim-selector-bar .form-select {
              max-width: none !important;
            }
            .page-header {
              flex-direction: column;
              align-items: flex-start !important;
              gap: 12px;
            }
            .page-header__actions {
              width: 100%;
              display: flex;
              flex-wrap: wrap;
            }
            .page-header__actions .btn {
              flex: 1;
              justify-content: center;
            }
          }

          /* Phone (≤480px) */
          @media (max-width: 480px) {
            .stat-grid { grid-template-columns: 1fr !important; }
            .app-header__brand { font-size: 0.95rem; }
            .app-header__status { display: none; }
            .sim-results .grid-2 {
              grid-template-columns: 1fr !important;
            }
          }

          .form-row-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
          .sep { border-top: 1px solid var(--border-subtle); margin: 4px 0; }

          @media (max-width: 480px) {
            .form-row-3 { grid-template-columns: 1fr !important; }
            .grid-2 { grid-template-columns: 1fr !important; }
          }
        `
      }} />
    </>
  );
};

export default SimulationPage;