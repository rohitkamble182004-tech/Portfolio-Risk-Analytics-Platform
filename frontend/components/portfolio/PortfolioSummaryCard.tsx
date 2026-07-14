import React from "react";
import type { Portfolio } from "../../types/portfolio";

interface Props {
  portfolio: Portfolio;
  onRefreshPrices?: () => void;
  isRefreshing?: boolean;
}

function fmt(n: number, digits = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export const PortfolioSummaryCard: React.FC<Props> = ({
  portfolio,
  onRefreshPrices,
  isRefreshing,
}) => {
  const isPositive = portfolio.totalGainLoss >= 0;

  const stats = [
    {
      label: "Market Value",
      value: fmtCurrency(portfolio.totalValue, portfolio.currency),
      highlight: true,
    },
    {
      label: "Total Cost",
      value: fmtCurrency(portfolio.totalCost, portfolio.currency),
    },
    {
      label: "Gain / Loss",
      value: `${isPositive ? "+" : ""}${fmtCurrency(portfolio.totalGainLoss, portfolio.currency)}`,
      sentiment: isPositive ? "pos" : "neg",
    },
    {
      label: "Return",
      value: `${isPositive ? "+" : ""}${fmt(portfolio.totalGainLossPct, 2)}%`,
      sentiment: isPositive ? "pos" : "neg",
    },
    {
      label: "Holdings",
      value: String(portfolio.holdings.length),
    },
  ];

  return (
    <div className="psc">
      <div className="psc__header">
        <div>
          <h2 className="psc__name">{portfolio.name}</h2>
          {portfolio.description && (
            <p className="psc__desc">{portfolio.description}</p>
          )}
        </div>
        {onRefreshPrices && (
          <button
            className="btn btn-ghost"
            onClick={onRefreshPrices}
            disabled={isRefreshing}
            style={{ fontSize: "0.8rem" }}
          >
            {isRefreshing ? (
              <span className="spinner" style={{ width: 14, height: 14 }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            )}
            Refresh
          </button>
        )}
      </div>

      <div className="psc__stats">
        {stats.map((s) => (
          <div key={s.label} className={`psc__stat ${s.highlight ? "psc__stat--highlight" : ""}`}>
            <span className="psc__stat-label">{s.label}</span>
            <span className={`psc__stat-value ${s.sentiment ?? ""}`}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="psc__meta">
        <span>Currency: <strong>{portfolio.currency}</strong></span>
        {portfolio.benchmarkTicker && (
          <span>Benchmark: <strong>{portfolio.benchmarkTicker}</strong></span>
        )}
        <span>Updated: <strong>{new Date(portfolio.updatedAt).toLocaleString()}</strong></span>
      </div>

      <style>{`
        .psc {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: 1.75rem;
        }
        .psc__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .psc__name {
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .psc__desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }
        .psc__stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1px;
          background: var(--border-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-bottom: 1rem;
        }
        .psc__stat {
          background: var(--bg-elevated);
          padding: 1rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .psc__stat--highlight {
          background: var(--bg-overlay);
        }
        .psc__stat-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .psc__stat-value {
          font-family: var(--font-mono);
          font-size: 1.05rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .psc__meta {
          display: flex;
          gap: 1.5rem;
          font-size: 0.78rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .psc__meta strong { color: var(--text-secondary); }
      `}</style>
    </div>
  );
};