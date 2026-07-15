// frontend/components/risk/RiskMetricsCard.tsx
// Rewritten to match backend API contract

import React from "react";
import type { RiskMetrics } from "../../types/risk";

interface Props {
  metrics: RiskMetrics;
  isLoading?: boolean;
}

function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

function sentimentClass(value: number | null | undefined, thresholds: { good: number; warn: number }): string {
  if (value == null || !Number.isFinite(value)) return "var(--text-muted)";
  if (value > thresholds.good) return "var(--green-bright)";
  if (value > thresholds.warn) return "var(--yellow-bright)";
  return "var(--red-bright)";
}

interface MetricItem {
  label: string;
  value: string;
  tooltip?: string;
  color: string;
}

const Skeleton = () => (
  <div className="rmc__skeleton">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="rmc__skel-item">
        <div className="rmc__skel-label" />
        <div className="rmc__skel-value" />
      </div>
    ))}
  </div>
);

export const RiskMetricsCard: React.FC<Props> = ({ metrics, isLoading }) => {
  if (isLoading) return <div className="card card--elevated"><Skeleton /></div>;
  if (!metrics) return null;

  const items: MetricItem[] = [
    {
      label: "Sharpe Ratio",
      value: fmt(metrics.sharpeRatio, 3),
      tooltip: "Excess return per unit of total risk",
      color: sentimentClass(metrics.sharpeRatio, { good: 1.5, warn: 0.8 }),
    },
    {
      label: "Sortino Ratio",
      value: fmt(metrics.sortinoRatio, 3),
      tooltip: "Excess return per unit of downside risk",
      color: sentimentClass(metrics.sortinoRatio, { good: 1.5, warn: 0.8 }),
    },
    {
      label: "Max Drawdown",
      value: fmtPct(metrics.maxDrawdown),
      tooltip: "Largest peak-to-trough decline",
      color: metrics.maxDrawdown != null && Math.abs(metrics.maxDrawdown) < 0.1 
        ? "var(--green-bright)" 
        : metrics.maxDrawdown != null && Math.abs(metrics.maxDrawdown) < 0.25 
          ? "var(--yellow-bright)" 
          : "var(--red-bright)",
    },
    {
      label: "Ann. Volatility",
      value: fmtPct(metrics.annualizedVolatility),
      tooltip: "Annualised standard deviation of returns",
      color: metrics.annualizedVolatility != null && metrics.annualizedVolatility < 0.12 
        ? "var(--green-bright)" 
        : metrics.annualizedVolatility != null && metrics.annualizedVolatility < 0.25 
          ? "var(--yellow-bright)" 
          : "var(--red-bright)",
    },
    {
      label: "Ann. Return",
      value: fmtPct(metrics.annualizedReturn),
      tooltip: "Average annual return",
      color: metrics.annualizedReturn != null && metrics.annualizedReturn > 0 
        ? "var(--green-bright)" 
        : "var(--red-bright)",
    },
  ];

  return (
    <div className="rmc card card--elevated">
      <div className="rmc__header">
        <h3 className="rmc__title">Risk Metrics</h3>
        <span className="rmc__badge">{metrics.tickers?.length || 0} assets</span>
      </div>

      <div className="rmc__grid">
        {items.map((item) => (
          <div key={item.label} className="rmc__item" title={item.tooltip}>
            <span className="rmc__item-label">{item.label}</span>
            <span className="rmc__item-value" style={{ color: item.color }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {metrics.correlationMatrix && metrics.correlationMatrix.length > 1 && (
        <div className="rmc__footer">
          <span className="rmc__footer-label">Correlation Matrix</span>
          <span className="rmc__footer-value">{metrics.correlationMatrix.length}×{metrics.correlationMatrix[0]?.length || 0}</span>
        </div>
      )}

      <style>{`
        .rmc__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .rmc__title { font-size: 1rem; font-weight: 700; font-family: var(--font-display); }
        .rmc__badge {
          font-size: 0.65rem;
          padding: 2px 10px;
          border-radius: 99px;
          background: var(--bg-elevated);
          color: var(--text-muted);
          font-family: var(--font-mono);
          border: 1px solid var(--border-subtle);
        }
        .rmc__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1px;
          background: var(--border-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .rmc__item {
          background: var(--bg-elevated);
          padding: 0.75rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          cursor: default;
          transition: background 0.12s;
        }
        .rmc__item:hover { background: var(--bg-overlay); }
        .rmc__item-label {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .rmc__item-value {
          font-family: var(--font-mono);
          font-size: 1rem;
          font-weight: 500;
        }
        .rmc__footer {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }
        .rmc__skeleton {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1rem;
        }
        .rmc__skel-item { display: flex; flex-direction: column; gap: 0.4rem; }
        .rmc__skel-label {
          height: 10px; width: 60%;
          background: var(--bg-overlay);
          border-radius: 4px;
          animation: pulse 1.4s ease-in-out infinite;
        }
        .rmc__skel-value {
          height: 20px; width: 80%;
          background: var(--bg-overlay);
          border-radius: 4px;
          animation: pulse 1.4s ease-in-out 0.2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};