// frontend/pages/portfolio.tsx — Fixed Mobile, Tablet & Desktop

import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { usePortfolio, usePortfolioMutations } from "../hooks/usePortfolio";
import { useRiskMetrics } from "../hooks/useRiskMetrics";
import type { Currency } from "../types/portfolio";
import { safeNumber, safeDate, safeString } from "../utils/dataAdapter";

type Tab = "holdings" | "risk" | "allocation" | "performance";
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

/* ─── Allocation donut ──────────────────────────────────────────────────── */
const DONUT_COLORS = [
  "#00e5cc", "#4d7cfe", "#8b5cf6", "#f59e0b",
  "#22c55e", "#fb923c", "#38bdf8", "#f472b6",
];

function AllocationDonut({ holdings }: { holdings: any[] }) {
  const total = holdings.reduce((s, h) => s + safeNumber(h.marketValue), 0);
  const data = holdings.map((h) => ({
    name: h.ticker,
    value: safeNumber(h.marketValue),
    pct: total > 0 ? ((safeNumber(h.marketValue) / total) * 100).toFixed(1) : "0",
  }));

  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="allocation-donut">
      <div className="allocation-donut__chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              dataKey="value"
              strokeWidth={0}
              onMouseEnter={(d) => setActive(d.name)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                  opacity={active && active !== entry.name ? 0.35 : 1}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="allocation-donut__legend">
        {data.slice(0, 8).map((d, i) => (
          <div
            key={d.name}
            className="allocation-donut__legend-item"
            onMouseEnter={() => setActive(d.name)}
            onMouseLeave={() => setActive(null)}
          >
            <div
              className="allocation-donut__legend-color"
              style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="allocation-donut__legend-name">{d.name}</span>
            <span className="allocation-donut__legend-pct">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Risk contribution bar ─────────────────────────────────────────────── */
function RiskContributionChart({ breakdown }: { breakdown: any }) {
  if (!breakdown?.breakdown) return null;
  const data = breakdown.breakdown.slice(0, 8).map((b: any) => ({
    ticker: b.ticker,
    contribution: parseFloat((b.percentContribution * 100).toFixed(1)),
  }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8 }}>
        <CartesianGrid horizontal={false} stroke="var(--border-subtle)" strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="ticker"
          tick={{ fill: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          contentStyle={{
            background: "var(--bg-overlay)",
            border: "1px solid var(--border-base)",
            borderRadius: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-primary)",
          }}
          formatter={(v: any) => [`${v}%`, "Contribution"]}
        />
        <Bar dataKey="contribution" fill="var(--blue)" radius={[0, 3, 3, 0]} maxBarSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Exposure by Sector ─────────────────────────────────────────────────── */
function SectorExposureChart({ holdings }: { holdings: any[] }) {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "1.5rem 0" }}>
        <p style={{ fontSize: "0.82rem" }}>Add holdings to see sector exposure.</p>
      </div>
    );
  }

  const bySector: Record<string, number> = {};
  const total = holdings.reduce((s, h) => s + safeNumber(h.marketValue), 0);
  holdings.forEach((h) => {
    const key = h.sector || h.assetClass || "Other";
    bySector[key] = (bySector[key] || 0) + safeNumber(h.marketValue);
  });

  const data = Object.entries(bySector)
    .map(([sector, val]) => ({
      sector,
      pct: total > 0 ? parseFloat(((val / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8 }}>
        <CartesianGrid horizontal={false} stroke="var(--border-subtle)" strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="sector"
          tick={{ fill: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
          contentStyle={{
            background: "var(--bg-overlay)",
            border: "1px solid var(--border-base)",
            borderRadius: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-primary)",
          }}
          formatter={(v: any) => [`${v}%`, "Exposure"]}
        />
        <Bar dataKey="pct" fill="var(--cyan)" radius={[0, 3, 3, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Monte Carlo Simulation summary ─────────────────────────────────────── */
function MonteCarloCard({ portfolioId, monteCarlo }: { portfolioId: string; monteCarlo?: any }) {
  if (!monteCarlo) {
    return (
      <div className="empty-state" style={{ padding: "1.25rem 0" }}>
        <div className="empty-state__icon">🎲</div>
        <h3 style={{ fontSize: "0.95rem" }}>No simulation yet</h3>
        <p style={{ fontSize: "0.8rem" }}>
          Run a Monte Carlo simulation to see best / worst / median case outcomes here.
        </p>
        <Link
          href={`/simulation?portfolioId=${portfolioId}`}
          className="btn btn-primary btn-sm"
          style={{ marginTop: 10 }}
        >
          Run Simulation
        </Link>
      </div>
    );
  }

  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
        {monteCarlo.iterations?.toLocaleString?.() ?? monteCarlo.iterations} iterations based on
        current volatility clusters.
      </p>
      <MetricRow label="Best Case (5%)" value={fmtPct(safeNumber(monteCarlo.bestCase))} color="var(--green-bright)" />
      <MetricRow label="Median Case" value={fmtPct(safeNumber(monteCarlo.median))} />
      <MetricRow label="Worst Case (5%)" value={fmtPct(safeNumber(monteCarlo.worstCase))} color="var(--red-bright)" />
    </div>
  );
}

/* ─── Risk Allocation gauge (systematic vs idiosyncratic + beta) ────────── */
function RiskAllocationGauge({ metrics }: { metrics: any }) {
  const beta = metrics?.beta;
  const systematicPct = metrics?.systematicRiskPct;
  const idiosyncraticPct = metrics?.idiosyncraticRiskPct;

  const hasSplit = Number.isFinite(systematicPct) && Number.isFinite(idiosyncraticPct);

  if (!hasSplit && !Number.isFinite(beta)) {
    return (
      <div className="empty-state" style={{ padding: "1.25rem 0" }}>
        <p style={{ fontSize: "0.8rem" }}>
          Systematic/idiosyncratic risk split and beta aren't available for this portfolio yet.
        </p>
      </div>
    );
  }

  return (
    <div className="risk-allocation-gauge">
      {hasSplit && (
        <div className="risk-allocation-gauge__bars">
          {[
            { label: "Systematic Risk", value: systematicPct, color: "var(--blue)" },
            { label: "Idiosyncratic Risk", value: idiosyncraticPct, color: "var(--violet, #8b5cf6)" },
          ].map((row) => (
            <div key={row.label}>
              <div className="risk-allocation-gauge__bar-label">
                <span>{row.label}</span>
                <span>{(row.value * 100).toFixed(0)}%</span>
              </div>
              <div className="risk-allocation-gauge__bar-track">
                <div
                  className="risk-allocation-gauge__bar-fill"
                  style={{
                    width: `${row.value * 100}%`,
                    background: row.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {Number.isFinite(beta) && (
        <div className="risk-allocation-gauge__beta">
          <span className="risk-allocation-gauge__beta-value">{beta.toFixed(2)}</span>
          <span className="risk-allocation-gauge__beta-label">beta</span>
        </div>
      )}
    </div>
  );
}

/* ─── Holdings table ────────────────────────────────────────────────────── */
function HoldingsTable({
  holdings,
  onRemove,
}: {
  holdings: any[];
  onRemove: (id: string) => void;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(safeNumber(n));

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Name</th>
            <th>Asset Class</th>
            <th className="col-right">Qty</th>
            <th className="col-right">Avg Cost</th>
            <th className="col-right">Price</th>
            <th className="col-right">Mkt Value</th>
            <th className="col-right">Weight</th>
            <th className="col-right">P&amp;L</th>
            <th className="col-right">Return</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(holdings) && holdings.map((h) => {
            const gainLoss = safeNumber(h.gainLoss);
            const isPos = gainLoss >= 0;
            return (
              <tr key={h.id}>
                <td>
                  <span className="holding-ticker">{h.ticker || "—"}</span>
                </td>
                <td className="holding-name">{h.name || "—"}</td>
                <td>
                  <span className={`badge badge-${h.assetClass === "equity" ? "blue" : h.assetClass === "bond" ? "green" : "violet"}`}>
                    {h.assetClass || "—"}
                  </span>
                </td>
                <td className="col-right col-mono">
                  {safeNumber(h.quantity).toLocaleString()}
                </td>
                <td className="col-right col-mono">{fmt(safeNumber(h.avgCost))}</td>
                <td className="col-right col-mono">{fmt(safeNumber(h.currentPrice))}</td>
                <td className="col-right col-mono" style={{ fontWeight: 500 }}>
                  {fmt(safeNumber(h.marketValue))}
                </td>
                <td className="col-right col-mono" style={{ color: "var(--text-secondary)" }}>
                  {(safeNumber(h.weight) * 100).toFixed(1)}%
                </td>
                <td
                  className="col-right col-mono"
                  style={{ color: isPos ? "var(--green-bright)" : "var(--red-bright)" }}
                >
                  {isPos ? "+" : ""}
                  {fmt(gainLoss)}
                </td>
                <td className="col-right col-mono">
                  <span
                    className={`badge ${isPos ? "badge-green" : "badge-red"}`}
                    style={{ fontSize: "0.68rem" }}
                  >
                    {isPos ? "▲" : "▼"} {Math.abs(safeNumber(h.gainLossPct)).toFixed(2)}%
                  </span>
                </td>
                <td>
                  <button className="btn btn-danger btn-xs" onClick={() => onRemove(h.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Metric row ────────────────────────────────────────────────────────── */
function MetricRow({
  label,
  value,
  color,
  tooltip,
}: {
  label: string;
  value: string | number;
  color?: string;
  tooltip?: string;
}) {
  return (
    <div className="metric-row">
      <span className="metric-row__label" title={tooltip}>
        {label}
        {tooltip && <span className="metric-row__tooltip">?</span>}
      </span>
      <span
        className="metric-row__value"
        style={{ color: color || "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Portfolio page ────────────────────────────────────────────────────── */
const PortfolioPage: NextPage = () => {
  const router = useRouter();
  const portfolioId = (router.query.id as string) ?? null;

  const showNewFormFromQuery = router.query.new === "true";
  const [showNewForm, setShowNewForm] = useState(!portfolioId || showNewFormFromQuery);
  const [showAddHolding, setShowAddHolding] = useState(false);

  useEffect(() => {
    if (router.query.new === "true") {
      setShowNewForm(true);
    }
  }, [router.query.new]);

  const { portfolio, isLoading, refresh } = usePortfolio(portfolioId);

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
  } = useRiskMetrics(portfolioId, riskPositions);

  const { addHolding, removeHolding, refreshPrices, createPortfolio, isSubmitting, mutationError } =
    usePortfolioMutations();

  const [tab, setTab] = useState<Tab>("holdings");

  /* New portfolio form state */
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCurrency, setNewCurrency] = useState<Currency>("USD");

  /* Add holding form state */
  const [hTicker, setHTicker] = useState("");
  const [hQty, setHQty] = useState("");
  const [hCost, setHCost] = useState("");
  const [hClass, setHClass] = useState<string>("equity");

  const handleCreate = async () => {
    const p = await createPortfolio({ name: newName, description: newDesc, currency: newCurrency });
    if (p) {
      router.push(`/portfolio?id=${p.id}`);
      setShowNewForm(false);
    }
  };

  const handleAddHolding = async () => {
    if (!portfolioId) return;
    const p = await addHolding(portfolioId, {
      ticker: hTicker.toUpperCase(),
      quantity: Number(hQty),
      avgCost: Number(hCost),
      assetClass: hClass as any,
    });
    if (p) {
      setShowAddHolding(false);
      setHTicker("");
      setHQty("");
      setHCost("");
      refresh();
    }
  };

  const handleRemoveHolding = async (holdingId: string) => {
    if (!portfolioId || !confirm("Remove this holding?")) return;
    await removeHolding(portfolioId, holdingId);
    refresh();
  };

  const handleRefreshPrices = async () => {
    if (!portfolioId) return;
    await refreshPrices(portfolioId);
    refresh();
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(safeNumber(n));

  /* ── New portfolio form ─────────────────────────────────────────────── */
  if (showNewForm) {
    return (
      <>
        <Head><title>New Portfolio — RiskLens</title></Head>
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
              <div className="app-header__portfolio-name">New Portfolio</div>
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
            <Link href="/portfolio" className="sidebar-item active">Portfolios</Link>
            <Link href="/simulation" className="sidebar-item">Simulation</Link>
            <div className="sidebar-section" style={{ marginTop: 8 }}>Risk</div>
            <Link href="/risk/var" className="sidebar-item">VaR / CVaR</Link>
            <Link href="/risk/stress" className="sidebar-item">Stress Tests</Link>
            <div className="sidebar-section" style={{ marginTop: 8 }}>Settings</div>
            <Link href="/settings" className="sidebar-item">Preferences</Link>
          </aside>
          <main className="page-content animate-in">
            <div style={{ maxWidth: 520, margin: "0 auto" }}>
              <div className="page-header">
                <div>
                  <h1 className="page-header__title">Create Portfolio</h1>
                  <p className="page-header__sub">Define a new portfolio to track risk and performance.</p>
                </div>
              </div>
              <div className="card">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Portfolio Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Tech Growth"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description (optional)</label>
                    <input
                      className="form-input"
                      placeholder="Brief description…"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Currency</label>
                      <select
                        className="form-select"
                        value={newCurrency}
                        onChange={(e) => setNewCurrency(e.target.value as Currency)}
                      >
                        <option>USD</option>
                        <option>EUR</option>
                        <option>GBP</option>
                        <option>INR</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Benchmark</label>
                      <input className="form-input" placeholder="SPY (optional)" />
                    </div>
                  </div>
                  {mutationError && <div className="alert alert-error">{mutationError}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    {portfolioId && (
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setShowNewForm(false);
                          if (portfolioId) {
                            router.push(`/portfolio?id=${portfolioId}`);
                          } else {
                            router.push("/");
                          }
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: "center", minWidth: 140 }}
                      disabled={!newName.trim() || isSubmitting}
                      onClick={handleCreate}
                    >
                      {isSubmitting ? <span className="spinner" /> : "Create Portfolio"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
        <BottomTabBar active="portfolio" />
      </>
    );
  }

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <>
        <Head><title>Portfolio — RiskLens</title></Head>
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
            <div className="app-header__center" />
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
            <Link href="/portfolio" className="sidebar-item active">Portfolios</Link>
            <Link href="/simulation" className="sidebar-item">Simulation</Link>
            <div className="sidebar-section" style={{ marginTop: 8 }}>Risk</div>
            <Link href="/risk/var" className="sidebar-item">VaR / CVaR</Link>
            <Link href="/risk/stress" className="sidebar-item">Stress Tests</Link>
            <div className="sidebar-section" style={{ marginTop: 8 }}>Settings</div>
            <Link href="/settings" className="sidebar-item">Preferences</Link>
          </aside>
          <main className="page-content animate-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          </main>
        </div>
        <BottomTabBar active="portfolio" />
      </>
    );
  }

  if (!portfolio) {
    return (
      <>
        <Head><title>Not Found — RiskLens</title></Head>
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
            <div className="app-header__center" />
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
            <Link href="/portfolio" className="sidebar-item active">Portfolios</Link>
            <Link href="/simulation" className="sidebar-item">Simulation</Link>
            <div className="sidebar-section" style={{ marginTop: 8 }}>Risk</div>
            <Link href="/risk/var" className="sidebar-item">VaR / CVaR</Link>
            <Link href="/risk/stress" className="sidebar-item">Stress Tests</Link>
            <div className="sidebar-section" style={{ marginTop: 8 }}>Settings</div>
            <Link href="/settings" className="sidebar-item">Preferences</Link>
          </aside>
          <main className="page-content animate-in">
            <div className="empty-state">
              <h3>Portfolio not found</h3>
              <Link href="/" className="btn btn-primary" style={{ marginTop: 12 }}>
                Go to Dashboard
              </Link>
            </div>
          </main>
        </div>
        <BottomTabBar active="portfolio" />
      </>
    );
  }

  if (riskError) {
    return (
      <>
        <Head><title>Risk Error — RiskLens</title></Head>
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
              <div className="app-header__portfolio-name">{safeString(portfolio.name)}</div>
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
            <Link href="/portfolio" className="sidebar-item active">Portfolios</Link>
            <Link href="/simulation" className="sidebar-item">Simulation</Link>
            <div className="sidebar-section" style={{ marginTop: 8 }}>Risk</div>
            <Link href="/risk/var" className="sidebar-item">VaR / CVaR</Link>
            <Link href="/risk/stress" className="sidebar-item">Stress Tests</Link>
            <div className="sidebar-section" style={{ marginTop: 8 }}>Settings</div>
            <Link href="/settings" className="sidebar-item">Preferences</Link>
          </aside>
          <main className="page-content animate-in">
            <div className="empty-state">
              <div className="empty-state__icon">⚠️</div>
              <h3>Risk data unavailable</h3>
              <p style={{ color: "var(--red-bright)" }}>{riskError}</p>
              <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: 12 }}>
                Retry
              </button>
            </div>
          </main>
        </div>
        <BottomTabBar active="portfolio" />
      </>
    );
  }

  const totalGainLossPct = safeNumber(portfolio.totalGainLossPct);
  const isPortPos = totalGainLossPct >= 0;
  const varResult = metrics?.var;
  const cvarResult = metrics?.cvar;
  const totalValue = safeNumber(portfolio.totalValue);

  const TABS: { key: Tab; label: string }[] = [
    { key: "holdings", label: "Holdings" },
    { key: "risk", label: "Risk Analysis" },
    { key: "allocation", label: "Allocation" },
    { key: "performance", label: "Performance" },
  ];

  return (
    <>
      <Head><title>{safeString(portfolio.name)} — RiskLens</title></Head>
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
            <div className="app-header__portfolio-name">{safeString(portfolio.name)}</div>
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
          <Link href="/portfolio" className="sidebar-item active">Portfolios</Link>
          <Link href="/simulation" className="sidebar-item">Simulation</Link>

          <div className="sidebar-section" style={{ marginTop: 8 }}>Risk</div>
          <Link href="/risk/var" className="sidebar-item">VaR / CVaR</Link>
          <Link href="/risk/stress" className="sidebar-item">Stress Tests</Link>

          <div className="sidebar-section" style={{ marginTop: 8 }}>Settings</div>
          <Link href="/settings" className="sidebar-item">Preferences</Link>
        </aside>

        {/* Main */}
        <main className="page-content animate-in">
          {/* Page header */}
          <div className="page-header">
            <div>
              <div className="page-header__breadcrumb">
                <Link href="/" className="page-header__breadcrumb-link">← Dashboard</Link>
                <button className="btn btn-ghost btn-xs" onClick={() => setShowNewForm(true)}>
                  ✎ Edit
                </button>
              </div>
              <h1 className="page-header__title">{safeString(portfolio.name)}</h1>
              <p className="page-header__sub">
                {Array.isArray(portfolio.holdings) ? portfolio.holdings.length : 0} holdings · {portfolio.currency || "USD"} ·{" "}
                Updated {safeDate(portfolio.updatedAt)}
              </p>
            </div>
            <div className="page-header__actions">
              <button className="btn btn-secondary btn-sm" onClick={handleRefreshPrices} disabled={isSubmitting}>
                {isSubmitting ? <span className="spinner" /> : "↻"} Refresh Prices
              </button>
              <Link href={`/simulation?portfolioId=${portfolio.id}`} className="btn btn-secondary btn-sm">
                Simulate
              </Link>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddHolding(true)}>
                + Add Holding
              </button>
            </div>
          </div>

          {/* Summary stat row */}
          <div className="stat-grid">
            <div className="stat-card stat-card--accent">
              <div className="stat-card__label">Market Value</div>
              <div className="stat-card__value">{fmt(totalValue)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Total Cost</div>
              <div className="stat-card__value" style={{ color: "var(--text-secondary)" }}>
                {fmt(safeNumber(portfolio.totalCost))}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">P&amp;L</div>
              <div className="stat-card__value" style={{ color: isPortPos ? "var(--green-bright)" : "var(--red-bright)" }}>
                {isPortPos ? "+" : ""}
                {fmt(safeNumber(portfolio.totalGainLoss))}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Return</div>
              <div className="stat-card__value" style={{ color: isPortPos ? "var(--green-bright)" : "var(--red-bright)" }}>
                {isPortPos ? "+" : ""}
                {totalGainLossPct.toFixed(2)}%
              </div>
            </div>
            <div className="stat-card stat-card--highlight">
              <div className="stat-card__label">VaR 95% (1d)</div>
              <div className="stat-card__value" style={{ color: "var(--red-bright)" }}>
                {varResult && Number.isFinite(varResult.varDollar) && varResult.varDollar > 0 ? fmt(varResult.varDollar) : "—"}
              </div>
              {varResult && varResult.varPct != null && Number.isFinite(varResult.varPct) && (
                <div className="stat-card__sub">{(varResult.varPct * 100).toFixed(2)}% of NAV</div>
              )}
            </div>
            <div className="stat-card stat-card--highlight">
              <div className="stat-card__label">CVaR 95% (1d)</div>
              <div className="stat-card__value" style={{ color: "var(--red-bright)" }}>
                {cvarResult && Number.isFinite(cvarResult.cvarDollar) && cvarResult.cvarDollar > 0
                  ? fmt(cvarResult.cvarDollar)
                  : "—"}
              </div>
            </div>
          </div>

          {/* Add holding inline form */}
          {showAddHolding && (
            <div className="card animate-in" style={{ marginBottom: 16 }}>
              <div className="card-title">Add Holding</div>
              <div className="form-row-3" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Ticker</label>
                  <input
                    className="form-input"
                    placeholder="AAPL"
                    value={hTicker}
                    onChange={(e) => setHTicker(e.target.value.toUpperCase())}
                    style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase" }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="100"
                    value={hQty}
                    onChange={(e) => setHQty(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Avg Cost ($)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="150.00"
                    value={hCost}
                    onChange={(e) => setHCost(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Asset Class</label>
                  <select className="form-select" value={hClass} onChange={(e) => setHClass(e.target.value)}>
                    <option value="equity">Equity</option>
                    <option value="bond">Bond</option>
                    <option value="commodity">Commodity</option>
                    <option value="cash">Cash</option>
                    <option value="crypto">Crypto</option>
                    <option value="alternative">Alternative</option>
                  </select>
                </div>
              </div>
              {mutationError && (
                <div className="alert alert-error" style={{ marginBottom: 12 }}>
                  {mutationError}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-ghost" onClick={() => setShowAddHolding(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!hTicker || !hQty || !hCost || isSubmitting}
                  onClick={handleAddHolding}
                  style={{ flex: 1, minWidth: 120 }}
                >
                  {isSubmitting ? <span className="spinner" /> : "Add Holding"}
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`tab ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
                style={{ whiteSpace: "nowrap" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Holdings tab ───────────────────────────────────────────── */}
          {tab === "holdings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="table-responsive">
                <HoldingsTable holdings={portfolio.holdings || []} onRemove={handleRemoveHolding} />
              </div>

              <div className="grid-2">
                <div className="card">
                  <div className="card-title">Exposure by Sector</div>
                  <SectorExposureChart holdings={portfolio.holdings || []} />
                </div>
                <div className="card">
                  <div className="card-title">Monte Carlo Simulation</div>
                  <MonteCarloCard portfolioId={portfolio.id} monteCarlo={(metrics as any)?.monteCarlo} />
                </div>
              </div>
            </div>
          )}

          {/* ── Risk tab ───────────────────────────────────────────────── */}
          {tab === "risk" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {riskLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                  <span className="spinner" style={{ width: 28, height: 28 }} />
                </div>
              ) : metrics ? (
                <div className="grid-2">
                  <div className="card">
                    <div className="card-title">Value at Risk</div>
                    {metrics?.var && (
                      <MetricRow
                        label={`VaR ${(safeNumber(metrics.var.confidenceLevel) * 100).toFixed(0)}%`}
                        value={fmt(safeNumber(metrics.var.varDollar))}
                        color="var(--red-bright)"
                      />
                    )}
                    {metrics?.cvar && (
                      <MetricRow
                        label={`CVaR ${(safeNumber(metrics.cvar.confidenceLevel) * 100).toFixed(0)}%`}
                        value={fmt(safeNumber(metrics.cvar.cvarDollar))}
                        color="var(--orange)"
                      />
                    )}
                  </div>

                  <div className="card">
                    <div className="card-title">Risk-Adjusted Metrics</div>
                    <MetricRow
                      label="Sharpe Ratio"
                      value={metrics.sharpeRatio != null && Number.isFinite(metrics.sharpeRatio) ? metrics.sharpeRatio.toFixed(3) : "—"}
                      color={
                        metrics.sharpeRatio != null && Number.isFinite(metrics.sharpeRatio) && metrics.sharpeRatio > 1
                          ? "var(--green-bright)"
                          : "var(--yellow-bright)"
                      }
                      tooltip="Excess return per unit of volatility"
                    />
                    <MetricRow
                      label="Sortino Ratio"
                      value={metrics.sortinoRatio != null && Number.isFinite(metrics.sortinoRatio) ? metrics.sortinoRatio.toFixed(3) : "—"}
                      tooltip="Downside risk-adjusted return"
                    />
                    <MetricRow
                      label="Max Drawdown"
                      value={
                        metrics.maxDrawdown != null && Number.isFinite(metrics.maxDrawdown)
                          ? `${(Math.abs(metrics.maxDrawdown) * 100).toFixed(2)}%`
                          : "—"
                      }
                      color="var(--red-bright)"
                    />
                    <MetricRow
                      label="Ann. Volatility"
                      value={
                        metrics.annualizedVolatility != null && Number.isFinite(metrics.annualizedVolatility)
                          ? `${(metrics.annualizedVolatility * 100).toFixed(2)}%`
                          : "—"
                      }
                    />
                    <MetricRow
                      label="Ann. Return"
                      value={
                        metrics.annualizedReturn != null && Number.isFinite(metrics.annualizedReturn)
                          ? `${(metrics.annualizedReturn * 100).toFixed(2)}%`
                          : "—"
                      }
                      color={
                        metrics.annualizedReturn != null && Number.isFinite(metrics.annualizedReturn) && metrics.annualizedReturn > 0
                          ? "var(--green-bright)"
                          : "var(--red-bright)"
                      }
                    />
                  </div>

                  <div className="card">
                    <div className="card-title">Risk Allocation</div>
                    <RiskAllocationGauge metrics={metrics} />
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <h3>Risk data unavailable</h3>
                  <p>Try refreshing prices or add more holdings.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Allocation tab ─────────────────────────────────────────── */}
          {tab === "allocation" && (
            <div className="grid-2">
              <div className="card">
                <div className="card-title">Holdings Allocation</div>
                <AllocationDonut holdings={portfolio.holdings || []} />
              </div>
              <div className="card">
                <div className="card-title">Asset Class Breakdown</div>
                {(() => {
                  const byClass: Record<string, number> = {};
                  const holdings = portfolio.holdings || [];
                  const total = holdings.reduce((s: number, h: any) => s + safeNumber(h.marketValue), 0);
                  holdings.forEach((h: any) => {
                    byClass[h.assetClass] = (byClass[h.assetClass] || 0) + safeNumber(h.marketValue);
                  });
                  return Object.entries(byClass).map(([cls, val], i) => (
                    <div key={cls} style={{ marginBottom: 10 }}>
                      <div className="asset-class-row">
                        <span className="asset-class-row__label">{cls}</span>
                        <span className="asset-class-row__value">
                          {total > 0 ? ((val / total) * 100).toFixed(1) : "0"}%
                        </span>
                      </div>
                      <div className="asset-class-row__track">
                        <div
                          className="asset-class-row__fill"
                          style={{
                            width: total > 0 ? `${(val / total) * 100}%` : "0%",
                            background: DONUT_COLORS[i % DONUT_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* ── Performance tab ────────────────────────────────────────── */}
          {tab === "performance" && (
            <div className="empty-state">
              <div className="empty-state__icon">📈</div>
              <h3>Performance chart</h3>
              <p>Historical performance vs benchmark — coming soon.</p>
            </div>
          )}
        </main>
      </div>

      <BottomTabBar active="portfolio" />

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
          --orange: #ffa94d;
          --blue: #4dabf7;
          --violet: #8b5cf6;
          --yellow-bright: #ffd93d;
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

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid var(--border-subtle);
          border-top-color: var(--cyan);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
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
        .btn-ghost {
          background: transparent;
          border-color: transparent;
          color: var(--text-muted);
        }
        .btn-ghost:hover {
          background: var(--bg-elevated);
          border-color: var(--border-subtle);
        }
        .btn-danger {
          background: rgba(255, 107, 107, 0.1);
          border-color: rgba(255, 107, 107, 0.2);
          color: var(--red-bright);
        }
        .btn-danger:hover {
          background: rgba(255, 107, 107, 0.2);
        }
        .btn-sm {
          padding: 4px 10px;
          font-size: 0.72rem;
        }
        .btn-xs {
          padding: 2px 8px;
          font-size: 0.65rem;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── Page header ───────────────────────────────────────────────────────── */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .page-header__breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }
        .page-header__breadcrumb-link {
          color: var(--text-muted);
          font-size: 0.78rem;
          text-decoration: none;
        }
        .page-header__breadcrumb-link:hover {
          color: var(--text-secondary);
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
        .page-header__actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        /* ── Stat grid ─────────────────────────────────────────────────────────── */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-lg);
          padding: 14px 16px;
        }
        .stat-card--accent {
          border-color: var(--border-base);
        }
        .stat-card--highlight {
          border: 1px solid rgba(255, 90, 90, 0.35);
          background: linear-gradient(180deg, rgba(255, 90, 90, 0.08), transparent);
        }
        .stat-card__label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .stat-card__value {
          font-family: var(--font-mono);
          font-size: 1.2rem;
          font-weight: 500;
          color: var(--text-primary);
          margin-top: 2px;
        }
        .stat-card__sub {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* ── Form elements ────────────────────────────────────────────────────── */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-label {
          font-size: 0.72rem;
          font-weight: 500;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }
        .form-input {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-md);
          padding: 6px 10px;
          color: var(--text-primary);
          font-size: 0.85rem;
          font-family: var(--font-mono);
          outline: none;
          width: 100%;
        }
        .form-input:focus {
          border-color: var(--cyan);
        }
        .form-input::placeholder {
          color: var(--text-muted);
        }
        .form-select {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-md);
          padding: 6px 10px;
          color: var(--text-primary);
          font-size: 0.85rem;
          font-family: var(--font-mono);
          outline: none;
          width: 100%;
        }
        .form-select:focus {
          border-color: var(--cyan);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .form-row-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        /* ── Card ──────────────────────────────────────────────────────────────── */
        .card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-xl);
          padding: 18px;
        }
        .card-title {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          margin-bottom: 10px;
        }

        /* ── Badges ────────────────────────────────────────────────────────────── */
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.65rem;
          font-family: var(--font-mono);
          font-weight: 500;
          border: 1px solid var(--border-subtle);
        }
        .badge-blue {
          background: rgba(77, 171, 247, 0.1);
          color: var(--blue);
          border-color: rgba(77, 171, 247, 0.2);
        }
        .badge-green {
          background: rgba(105, 219, 124, 0.1);
          color: var(--green-bright);
          border-color: rgba(105, 219, 124, 0.2);
        }
        .badge-violet {
          background: rgba(139, 92, 246, 0.1);
          color: var(--violet);
          border-color: rgba(139, 92, 246, 0.2);
        }
        .badge-red {
          background: rgba(255, 107, 107, 0.1);
          color: var(--red-bright);
          border-color: rgba(255, 107, 107, 0.2);
        }

        /* ── Tabs ──────────────────────────────────────────────────────────────── */
        .tabs {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 16px;
          padding-bottom: 0;
        }
        .tab {
          padding: 8px 16px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-muted);
          font-size: 0.82rem;
          font-family: var(--font-mono);
          cursor: pointer;
          transition: all 0.15s;
        }
        .tab:hover {
          color: var(--text-secondary);
        }
        .tab.active {
          color: var(--cyan);
          border-bottom-color: var(--cyan);
        }

        /* ── Table ─────────────────────────────────────────────────────────────── */
        .table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          min-width: 900px;
        }
        .data-table thead {
          border-bottom: 1px solid var(--border-subtle);
        }
        .data-table th {
          text-align: left;
          padding: 10px 8px;
          color: var(--text-muted);
          font-weight: 500;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }
        .data-table td {
          padding: 10px 8px;
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }
        .data-table tr:hover td {
          background: var(--bg-elevated);
        }
        .col-right {
          text-align: right;
        }
        .col-mono {
          font-family: var(--font-mono);
        }
        .holding-ticker {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--cyan);
          font-size: 0.85rem;
        }
        .holding-name {
          color: var(--text-secondary);
          font-size: 0.82rem;
        }

        /* ── Grid layouts ──────────────────────────────────────────────────────── */
        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        /* ── Empty state ──────────────────────────────────────────────────────── */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
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
          max-width: 400px;
        }

        /* ── Alert ────────────────────────────────────────────────────────────── */
        .alert {
          padding: 10px 14px;
          border-radius: var(--r-md);
          font-size: 0.82rem;
          font-family: var(--font-mono);
        }
        .alert-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--red-bright);
        }

        /* ── Allocation donut ──────────────────────────────────────────────────── */
        .allocation-donut {
          display: flex;
          gap: 24px;
          align-items: center;
          flex-wrap: wrap;
        }
        .allocation-donut__chart {
          width: 180px;
          height: 180px;
          flex-shrink: 0;
        }
        .allocation-donut__legend {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 140px;
        }
        .allocation-donut__legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: opacity 0.15s;
          padding: 2px 0;
        }
        .allocation-donut__legend-color {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .allocation-donut__legend-name {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--text-secondary);
          flex: 1;
        }
        .allocation-donut__legend-pct {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        /* ── Asset class row ──────────────────────────────────────────────────── */
        .asset-class-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 0.82rem;
        }
        .asset-class-row__label {
          color: var(--text-secondary);
        }
        .asset-class-row__value {
          font-family: var(--font-mono);
          color: var(--text-primary);
        }
        .asset-class-row__track {
          height: 5px;
          background: var(--bg-elevated);
          border-radius: 99px;
          overflow: hidden;
        }
        .asset-class-row__fill {
          height: 100%;
          border-radius: 99px;
        }

        /* ── Risk allocation gauge ────────────────────────────────────────────── */
        .risk-allocation-gauge {
          display: flex;
          gap: 20px;
          align-items: center;
          flex-wrap: wrap;
        }
        .risk-allocation-gauge__bars {
          flex: 1;
          min-width: 160px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .risk-allocation-gauge__bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          margin-bottom: 4px;
        }
        .risk-allocation-gauge__bar-label span:first-child {
          color: var(--text-secondary);
        }
        .risk-allocation-gauge__bar-label span:last-child {
          font-family: var(--font-mono);
          color: var(--text-primary);
        }
        .risk-allocation-gauge__bar-track {
          height: 6px;
          background: var(--bg-elevated);
          border-radius: 99px;
          overflow: hidden;
        }
        .risk-allocation-gauge__bar-fill {
          height: 100%;
          border-radius: 99px;
        }
        .risk-allocation-gauge__beta {
          width: 88px;
          height: 88px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 3px solid var(--cyan);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .risk-allocation-gauge__beta-value {
          font-family: var(--font-mono);
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .risk-allocation-gauge__beta-label {
          font-size: 0.6rem;
          color: var(--text-muted);
        }

        /* ── Metric row ────────────────────────────────────────────────────────── */
        .metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-subtle);
        }
        .metric-row:last-child {
          border-bottom: none;
        }
        .metric-row__label {
          font-size: 0.82rem;
          color: var(--text-secondary);
        }
        .metric-row__tooltip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: 4px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--bg-elevated);
          border: 1px solid var(--border-base);
          font-size: 0.6rem;
          color: var(--text-muted);
          cursor: help;
        }
        .metric-row__value {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          font-weight: 500;
        }

        /* ── Bottom tab bar (hidden on desktop) ──────────────────────────────── */
        .bottom-tab-bar {
          display: none !important;
        }

        /* ════════════════════════════════════════════════════════════════════════
           TABLET (769px – 1024px): sidebar visible, condensed grids
           ════════════════════════════════════════════════════════════════════════ */
        @media (max-width: 1024px) and (min-width: 769px) {
          .app-shell {
            grid-template-columns: 200px 1fr;
          }
          .stat-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 10px !important;
          }
          .grid-2 {
            grid-template-columns: 1fr 1fr;
          }
          .bottom-tab-bar {
            display: none !important;
          }
          .sidebar-item span:last-child,
          .sidebar-section {
            font-size: 0.72rem;
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

          .stat-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
          }
          .grid-2 {
            grid-template-columns: 1fr;
          }
          .form-row {
            grid-template-columns: 1fr;
          }
          .form-row-3 {
            grid-template-columns: 1fr;
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

          .allocation-donut {
            flex-direction: column;
            align-items: stretch;
          }
          .allocation-donut__chart {
            align-self: center;
          }
          .risk-allocation-gauge {
            flex-direction: column;
            align-items: stretch;
          }
          .risk-allocation-gauge__beta {
            align-self: center;
          }
        }

        /* ════════════════════════════════════════════════════════════════════════
           PHONE (≤480px): single column everything, tighter spacing
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
          .page-header__actions {
            width: 100%;
          }
          .page-header__actions .btn {
            flex: 1;
            justify-content: center;
            min-width: 60px;
            font-size: 0.68rem;
          }
          .stat-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
          }
          .stat-card {
            padding: 10px 12px;
          }
          .stat-card__value {
            font-size: 1rem;
          }
          .stat-card__label {
            font-size: 0.58rem;
          }

          .card {
            padding: 14px;
          }
          .data-table {
            font-size: 0.7rem;
            min-width: 700px;
          }
          .data-table th,
          .data-table td {
            padding: 6px 4px;
          }
          .holding-ticker {
            font-size: 0.75rem;
          }
          .tabs .tab {
            padding: 6px 12px;
            font-size: 0.72rem;
          }

          .allocation-donut__chart {
            width: 140px;
            height: 140px;
          }
          .risk-allocation-gauge__beta {
            width: 72px;
            height: 72px;
          }
          .risk-allocation-gauge__beta-value {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </>
  );
};

export default PortfolioPage;