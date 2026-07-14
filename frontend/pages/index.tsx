// frontend/pages/index.tsx (Dashboard) - Upgraded Desktop UI

import React, { useMemo, useState, useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { usePortfolioList, usePortfolioMutations } from "../hooks/usePortfolio";
import { 
  safeNumber, 
  safeCurrency, 
  safePercent, 
  safeDate,
  safeString,
  NormalizedPortfolio 
} from "../utils/dataAdapter";

/* ─── Types ───────────────────────────────────────────────────────────── */
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

/* ─── Bottom tab bar (mobile only, ≤900px) ────────────────────────────── */
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

/* ─── Sparkline data generator ──────────────────────────────────────────── */
function mockSparkline(seed: number, len = 20) {
  const data: { v: number }[] = [];
  let v = 100 + (seed % 30);
  for (let i = 0; i < len; i++) {
    v += (Math.sin(i * seed * 0.4) * 2.5) + ((Math.random() - 0.48) * 3);
    data.push({ v: Math.max(60, v) });
  }
  return data;
}

/* ─── Mini sparkline component ──────────────────────────────────────────── */
function Sparkline({ seed, positive }: { seed: number; positive: boolean }) {
  const data = useMemo(() => mockSparkline(seed), [seed]);
  const color = positive ? "var(--green-bright)" : "var(--red-bright)";
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sg-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.18} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#sg-${seed})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─── Risk meter bar ────────────────────────────────────────────────────── */
function RiskMeter({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((safeNumber(value) / safeNumber(max)) * 100, 100);
  return (
    <div className="risk-meter-track">
      <div
        className="risk-meter-fill"
        style={{
          width: `${pct}%`,
          background: color,
        }}
      />
    </div>
  );
}

/* ─── Stat card (upgraded to match risk-metric-card pattern) ──────────── */
function StatCard({
  label,
  value,
  sub,
  accent,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delta?: number;
  deltaLabel?: string;
}) {
  const isPos = (safeNumber(delta) ?? 0) >= 0;
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value" style={accent ? { color: accent } : {}}>
        {value || "—"}
      </div>
      {delta !== undefined && delta !== null && !isNaN(delta) ? (
        <div className="stat-card__delta" style={{ color: isPos ? "var(--green-bright)" : "var(--red-bright)" }}>
          {isPos ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}%
          {deltaLabel && <span className="stat-card__delta-label">{deltaLabel}</span>}
        </div>
      ) : sub ? (
        <div className="stat-card__sub">{sub}</div>
      ) : null}
    </div>
  );
}

/* ─── Portfolio card ────────────────────────────────────────────────────── */
function PortfolioCard({
  p,
  idx,
  onDelete,
  isSubmitting,
}: {
  p: NormalizedPortfolio;
  idx: number;
  onDelete: (id: string) => void;
  isSubmitting: boolean;
}) {
  const totalGainLossPct = safeNumber(p.totalGainLossPct);
  const totalValue = safeNumber(p.totalValue);
  const isPos = totalGainLossPct >= 0;

  const fmtValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: p.currency || "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(totalValue || 0);

  const riskColors = ["var(--cyan)", "var(--blue)", "var(--violet)"];
  const riskColor = riskColors[idx % riskColors.length];

  return (
    <div className="port-card animate-in" style={{ animationDelay: `${idx * 0.06}s` }}>
      {/* Header row */}
      <div className="port-card__header">
        <div>
          <Link href={`/portfolio?id=${p.id}`} className="port-card__name">
            {safeString(p.name)}
          </Link>
          <div className="port-card__meta">
            <span className="badge badge-neutral">{p.holdingCount || 0} holdings</span>
          </div>
        </div>
        <button
          className="btn btn-danger btn-xs"
          onClick={() => onDelete(p.id)}
          disabled={isSubmitting}
          aria-label="Delete portfolio"
        >
          ✕
        </button>
      </div>

      {/* Sparkline */}
      <div className="port-card__sparkline">
        <Sparkline seed={idx + 3} positive={isPos} />
      </div>

      {/* Value and return */}
      <div className="port-card__financials">
        <div>
          <div className="port-card__value">{fmtValue}</div>
          <div
            className="port-card__return"
            style={{ color: isPos ? "var(--green-bright)" : "var(--red-bright)" }}
          >
            {isPos ? "▲" : "▼"} {Math.abs(totalGainLossPct).toFixed(2)}%
          </div>
        </div>
        <div className="port-card__risk-col">
          <div className="port-card__risk-label">Risk</div>
          <RiskMeter
            value={Math.abs(totalGainLossPct) * 3}
            max={60}
            color={riskColor}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="port-card__actions">
        <Link
          href={`/portfolio?id=${p.id}`}
          className="btn btn-ghost btn-sm"
          style={{ flex: 1, justifyContent: "center" }}
        >
          View
        </Link>
        <Link
          href={`/simulation?portfolioId=${p.id}`}
          className="btn btn-secondary btn-sm"
          style={{ flex: 1, justifyContent: "center" }}
        >
          Simulate
        </Link>
      </div>
    </div>
  );
}

/* ─── Market summary ticker ─────────────────────────────────────────────── */
const MARKET_TICKERS = [
  { label: "S&P 500", val: "5,847.22", delta: +0.43 },
  { label: "NASDAQ", val: "19,214.10", delta: +0.71 },
  { label: "10Y UST", val: "4.42%", delta: -0.03 },
  { label: "VIX", val: "14.82", delta: -1.24 },
  { label: "Gold", val: "$3,118", delta: +0.22 },
  { label: "BTC", val: "$103,420", delta: +2.14 },
];

/* ─── Dashboard ─────────────────────────────────────────────────────────── */
const Dashboard: NextPage = () => {
  const { portfolios, isLoading, error, refresh } = usePortfolioList();
  const { deletePortfolio, isSubmitting } = usePortfolioMutations();

  // State for aggregated risk metrics
  const [aggregatedVaR, setAggregatedVaR] = useState<number | null>(null);
  const [aggregatedSharpe, setAggregatedSharpe] = useState<number | null>(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);

  // Safe calculations with null checks
  const totalValue = Array.isArray(portfolios) 
    ? portfolios.reduce((s, p) => s + safeNumber(p.totalValue), 0)
    : 0;

  const avgReturn = Array.isArray(portfolios) && portfolios.length > 0
    ? portfolios.reduce((s, p) => s + safeNumber(p.totalGainLossPct), 0) / portfolios.length
    : 0;

  const totalPositions = Array.isArray(portfolios)
    ? portfolios.reduce((s, p) => s + (p.holdingCount || 0), 0)
    : 0;

  // Fetch risk metrics for each portfolio and aggregate
  useEffect(() => {
    const fetchRiskMetrics = async () => {
      if (!Array.isArray(portfolios) || portfolios.length === 0) {
        setAggregatedVaR(null);
        setAggregatedSharpe(null);
        return;
      }

      setIsLoadingRisk(true);
      try {
        let totalVarDollar = 0;
        let totalSharpe = 0;
        let sharpeCount = 0;

        for (const portfolio of portfolios) {
          const positions = portfolio.holdings?.map((h: any) => ({
            symbol: h.ticker,
            marketValue: safeNumber(h.marketValue),
          })) || [];

          if (positions.length === 0) continue;

          try {
            const { riskApi } = await import("../services/riskApi");
            const totalValue = positions.reduce((sum, p) => sum + safeNumber(p.marketValue), 0);
            const weights = positions.map((p) => safeNumber(p.marketValue) / totalValue);
            const tickers = positions.map((p) => p.symbol);

            const metrics = await riskApi.getMetrics({
              portfolioId: portfolio.id,
              tickers,
              weights,
              lookback_days: 252,
              confidence_level: 0.95,
              time_horizon: 1,
              method: "historical",
              portfolio_value: totalValue,
            });

            if (metrics?.var?.varDollar) {
              totalVarDollar += safeNumber(metrics.var.varDollar);
            }
            if (metrics?.sharpeRatio != null && Number.isFinite(metrics.sharpeRatio)) {
              totalSharpe += metrics.sharpeRatio;
              sharpeCount++;
            }
          } catch (err) {
            console.warn(`Failed to fetch risk for ${portfolio.name}:`, err);
          }
        }

        setAggregatedVaR(totalVarDollar > 0 ? totalVarDollar : null);
        setAggregatedSharpe(sharpeCount > 0 ? totalSharpe / sharpeCount : null);
      } catch (err) {
        console.error("Failed to aggregate risk metrics:", err);
      } finally {
        setIsLoadingRisk(false);
      }
    };

    fetchRiskMetrics();
  }, [portfolios]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this portfolio?")) return;
    await deletePortfolio(id);
    refresh();
  };

  // Safe last updated date
  const lastUpdated = Array.isArray(portfolios) && portfolios.length > 0
    ? (() => {
        const dates = portfolios
          .map(p => p.updatedAt)
          .filter(d => d && d !== "—")
          .map(d => new Date(d).getTime())
          .filter(t => !isNaN(t));
        if (dates.length === 0) return "—";
        return new Date(Math.max(...dates)).toLocaleDateString();
      })()
    : "—";

  // Safe currency formatter
  const fmtCurrency = (value: number | null): string => {
    if (value === null || value === undefined || !Number.isFinite(value) || value === 0) {
      return "—";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <>
      <Head>
        <title>Dashboard — RiskLens</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app-shell">
        {/* Header — matches Stress/VaR/Settings: brand + center name + status */}
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
            <div className="app-header__portfolio-name">Dashboard</div>
          </div>
          <div className="app-header__right">
            <div className="app-header__status">
              <div className="status-dot" />
              Live
            </div>
          </div>
        </header>

        {/* Sidebar — matches other pages exactly */}
        <aside className="app-sidebar">
          <div className="sidebar-section">Main</div>
          <Link href="/" className="sidebar-item active">
            <svg className="sidebar-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </Link>
          <Link href="/portfolio" className="sidebar-item">
            <svg className="sidebar-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            Portfolios
            {Array.isArray(portfolios) && portfolios.length > 0 && (
              <span className="sidebar-badge">{portfolios.length}</span>
            )}
          </Link>
          <Link href="/simulation" className="sidebar-item">
            <svg className="sidebar-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Simulation
          </Link>

          <div className="sidebar-section" style={{ marginTop: 8 }}>Risk</div>
          <Link href="/risk/var" className="sidebar-item">
            <svg className="sidebar-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
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
            <svg className="sidebar-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            Preferences
          </Link>
        </aside>

        {/* Main content — upgraded layout */}
        <main className="page-content animate-in">
          {/* Page header — matches Stress/VaR/Settings pattern */}
          <div className="page-header">
            <div>
              <h1 className="page-header__title">Dashboard</h1>
              <p className="page-header__sub">
                Overview of all portfolios and risk exposure
              </p>
            </div>
            <div className="page-header__actions">
              <button className="btn btn-secondary btn-sm" onClick={refresh}>
                ↻ Refresh
              </button>
              <Link href="/portfolio?new=true" className="btn btn-primary">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Portfolio
              </Link>
            </div>
          </div>

          {/* Market Ticker — moved from header to content area, styled as a card strip */}
          <div className="ticker-bar">
            <div className="ticker-bar__inner">
              {MARKET_TICKERS.map((t) => (
                <div key={t.label} className="ticker-bar__item">
                  <span className="ticker-bar__label">{t.label}</span>
                  <span className="ticker-bar__val">{t.val}</span>
                  <span
                    className="ticker-bar__delta"
                    style={{ color: t.delta >= 0 ? "var(--green-bright)" : "var(--red-bright)" }}
                  >
                    {t.delta >= 0 ? "+" : ""}{t.delta}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="alert alert-error animate-in" style={{ marginBottom: 16 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Summary stats — upgraded to match risk-metric-card styling */}
          <div className="stat-grid">
            <StatCard
              label="Total AUM"
              value={new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                notation: "compact",
                maximumFractionDigits: 2,
              }).format(totalValue || 0)}
              sub={`${Array.isArray(portfolios) ? portfolios.length : 0} portfolio${Array.isArray(portfolios) && portfolios.length !== 1 ? "s" : ""}`}
            />
            <StatCard
              label="Avg. Return"
              value={avgReturn !== 0 ? `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(2)}%` : "—"}
              accent={avgReturn >= 0 ? "var(--green-bright)" : "var(--red-bright)"}
              delta={avgReturn !== 0 ? avgReturn : undefined}
              deltaLabel="YTD"
            />
            <StatCard
              label="Active Positions"
              value={totalPositions.toString()}
              sub="across all portfolios"
            />
            <StatCard
              label="Portfolio VaR (95%)"
              value={isLoadingRisk ? "Loading..." : fmtCurrency(aggregatedVaR)}
              sub="1-day horizon"
              accent="var(--red-bright)"
            />
            <StatCard
              label="Sharpe Ratio"
              value={isLoadingRisk ? "Loading..." : (aggregatedSharpe != null && Number.isFinite(aggregatedSharpe) ? aggregatedSharpe.toFixed(3) : "—")}
              sub="risk-adjusted return"
              accent="var(--cyan)"
            />
            <StatCard
              label="Last Updated"
              value={lastUpdated}
              sub="market prices"
            />
          </div>

          {/* Portfolio list — upgraded section header */}
          <section className="port-section">
            <div className="port-section__header">
              <h2 className="port-section__title">Portfolios</h2>
              <span className="port-section__count">
                {Array.isArray(portfolios) ? portfolios.length : 0} total
              </span>
            </div>

            {isLoading ? (
              <div className="port-grid">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="port-card" style={{ gap: 10 }}>
                    <div className="skeleton" style={{ height: 16, width: "60%" }} />
                    <div className="skeleton" style={{ height: 48, marginTop: 8 }} />
                    <div className="skeleton" style={{ height: 22, width: "40%" }} />
                  </div>
                ))}
              </div>
            ) : !Array.isArray(portfolios) || portfolios.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📂</div>
                <h3>No portfolios yet</h3>
                <p>Create your first portfolio to start tracking risk and performance.</p>
                <Link href="/portfolio?new=true" className="btn btn-primary" style={{ marginTop: 12 }}>
                  Create portfolio
                </Link>
              </div>
            ) : (
              <div className="port-grid">
                {portfolios.map((p, idx) => (
                  <PortfolioCard
                    key={p.id}
                    p={p}
                    idx={idx}
                    onDelete={handleDelete}
                    isSubmitting={isSubmitting}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      <BottomTabBar active="dashboard" />

      <style dangerouslySetInnerHTML={{
        __html: `
          /* ── App shell layout ──────────────────────────────────────────────── */
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

          /* ── Ticker bar (moved from header to content area) ──────────────── */
          .ticker-bar {
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: var(--r-xl);
            padding: 10px 16px;
            margin-bottom: 16px;
            overflow: hidden;
          }
          .ticker-bar__inner {
            display: flex;
            align-items: center;
            gap: 0;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .ticker-bar__inner::-webkit-scrollbar { display: none; }
          .ticker-bar__item {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 14px;
            border-right: 1px solid var(--border-subtle);
            font-family: var(--font-mono);
            font-size: 0.72rem;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .ticker-bar__item:first-child { padding-left: 0; }
          .ticker-bar__item:last-child { border-right: none; padding-right: 0; }
          .ticker-bar__label { color: var(--text-muted); }
          .ticker-bar__val { color: var(--text-primary); font-weight: 500; }
          .ticker-bar__delta { font-size: 0.68rem; }

          /* ── Stat grid (upgraded to match risk-metric-card pattern) ──────── */
          .stat-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .stat-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: var(--r-lg);
            padding: 16px;
            transition: border-color 0.18s, transform 0.18s;
          }
          .stat-card:hover {
            border-color: var(--border-base);
            transform: translateY(-1px);
          }
          .stat-card__label {
            font-size: 0.68rem;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            color: var(--text-muted);
            font-family: var(--font-mono);
          }
          .stat-card__value {
            font-family: var(--font-mono);
            font-size: 1.4rem;
            font-weight: 500;
            color: var(--text-primary);
            margin-top: 4px;
            letter-spacing: -0.02em;
          }
          .stat-card__sub {
            font-size: 0.72rem;
            color: var(--text-muted);
            font-family: var(--font-mono);
            margin-top: 2px;
          }
          .stat-card__delta {
            font-family: var(--font-mono);
            font-size: 0.82rem;
            font-weight: 500;
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .stat-card__delta-label {
            color: var(--text-muted);
            font-size: 0.72rem;
            margin-left: 4px;
          }

          /* ── Portfolio section header (upgraded) ─────────────────────────── */
          .port-section { margin-top: 8px; }
          .port-section__header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
            flex-wrap: wrap;
            gap: 8px;
          }
          .port-section__title {
            font-size: 0.78rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.09em;
            color: var(--text-muted);
            font-family: var(--font-mono);
            margin: 0;
          }
          .port-section__count {
            font-size: 0.75rem;
            color: var(--text-muted);
            font-family: var(--font-mono);
          }

          /* ── Port grid ─────────────────────────────────────────────────────── */
          .port-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 12px;
          }
          .port-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: var(--r-xl);
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            transition: border-color 0.18s, transform 0.18s;
            cursor: default;
          }
          .port-card:hover {
            border-color: var(--border-base);
            transform: translateY(-2px);
          }
          .port-card__header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .port-card__name {
            font-family: var(--font-display);
            font-weight: 700;
            font-size: 1rem;
            color: var(--text-primary);
            text-decoration: none;
            display: block;
            margin-bottom: 4px;
            transition: color 0.15s;
          }
          .port-card__name:hover { color: var(--cyan); }
          .port-card__sparkline { margin: 8px -4px; }
          .port-card__financials {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 12px;
          }
          .port-card__value {
            font-family: var(--font-mono);
            font-size: 1.3rem;
            font-weight: 500;
            color: var(--text-primary);
            letter-spacing: -0.02em;
          }
          .port-card__return {
            font-family: var(--font-mono);
            font-size: 0.82rem;
            font-weight: 500;
            margin-top: 2px;
          }
          .port-card__risk-col {
            flex: 1;
            max-width: 100px;
          }
          .port-card__risk-label {
            font-size: 0.65rem;
            color: var(--text-muted);
            font-family: var(--font-mono);
            text-transform: uppercase;
            letter-spacing: 0.07em;
            margin-bottom: 4px;
            text-align: right;
          }
          .port-card__actions {
            display: flex;
            gap: 6px;
            padding-top: 10px;
            border-top: 1px solid var(--border-subtle);
            margin-top: 2px;
          }

          /* Risk meter */
          .risk-meter-track {
            height: 4px;
            background: var(--bg-elevated);
            border-radius: 99px;
            overflow: hidden;
          }
          .risk-meter-fill {
            height: 100%;
            border-radius: 99px;
            transition: width 0.6s cubic-bezier(.4,0,.2,1);
          }

          /* Alert */
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

          /* Empty state */
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

          /* ── Bottom tab bar: hidden by default (desktop/tablet) ──────────── */
          .bottom-tab-bar {
            display: none;
          }

          /* ══════════════════════════════════════════════════════════════════
             RESPONSIVE BREAKPOINTS
             ══════════════════════════════════════════════════════════════════ */

          /* ── Tablet (≤1024px): tighten grids ─────────────────────────────── */
          @media (max-width: 1024px) {
            .stat-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
            .port-grid {
              grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            }
            .ticker-bar__item {
              padding: 4px 10px;
              font-size: 0.68rem;
            }
          }

          /* ── Mobile/tablet (≤900px): sidebar hidden, bottom tab bar ────── */
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
            .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
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

          /* ── Small tablet / large phone (≤768px) ─────────────────────────── */
          @media (max-width: 768px) {
            .ticker-bar__inner {
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
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
            .stat-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 10px !important;
            }
          }

          /* ── Phone (≤480px) ─────────────────────────────────────────────── */
          @media (max-width: 480px) {
            .stat-grid { grid-template-columns: 1fr !important; }
            .port-grid { grid-template-columns: 1fr; }
            .port-card__financials {
              flex-direction: column;
              align-items: flex-start;
              gap: 10px;
            }
            .port-card__risk-col {
              max-width: none;
              width: 100%;
            }
            .app-header__brand span,
            .app-header__brand {
              font-size: 0.95rem;
            }
            .ticker-bar__item {
              padding: 4px 8px;
            }
          }
        `
      }} />
    </>
  );
};

export default Dashboard;