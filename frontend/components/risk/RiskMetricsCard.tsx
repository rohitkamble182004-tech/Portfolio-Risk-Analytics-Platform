import React from "react";
import type { RiskMetrics } from "../../types/risk";

interface Props {
  metrics: RiskMetrics;
  isLoading?: boolean;
}

function fmt(n: number, digits = 2) {
  return n.toFixed(digits);
}
function fmtPct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

interface MetricItem {
  label: string;
  value: string;
  tooltip?: string;
  sentiment?: "neutral" | "warn" | "danger" | "good";
}

function sentimentClass(s: MetricItem["sentiment"]) {
  if (s === "good")   return "var(--green)";
  if (s === "warn")   return "var(--yellow)";
  if (s === "danger") return "var(--red)";
  return "var(--text-primary)";
}

const Skeleton = () => (
  <div className="rmc__skeleton">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="rmc__skel-item">
        <div className="rmc__skel-label" />
        <div className="rmc__skel-value" />
      </div>
    ))}
  </div>
);

export const RiskMetricsCard: React.FC<Props> = ({ metrics, isLoading }) => {
  if (isLoading) return <div className="card card--elevated"><Skeleton /></div>;

  const ratioSentiment = (v: number): MetricItem["sentiment"] =>
    v > 1.5 ? "good" : v > 0.8 ? "neutral" : v > 0 ? "warn" : "danger";

  const items: MetricItem[] = [
    {
      label: "Sharpe Ratio",
      value: fmt(metrics.sharpeRatio),
      tooltip: "Excess return per unit of total risk",
      sentiment: ratioSentiment(metrics.sharpeRatio),
    },
    {
      label: "Sortino Ratio",
      value: fmt(metrics.sortinoRatio),
      tooltip: "Excess return per unit of downside risk",
      sentiment: ratioSentiment(metrics.sortinoRatio),
    },
    {
      label: "Beta",
      value: fmt(metrics.beta),
      tooltip: "Sensitivity to benchmark movements",
      sentiment: Math.abs(metrics.beta - 1) < 0.2 ? "neutral" : "warn",
    },
    {
      label: "Alpha (ann.)",
      value: fmtPct(metrics.alpha),
      tooltip: "Excess return vs benchmark",
      sentiment: metrics.alpha > 0 ? "good" : "warn",
    },
    {
      label: "Volatility (ann.)",
      value: fmtPct(metrics.volatilityAnnualized),
      tooltip: "Annualised standard deviation of returns",
      sentiment: metrics.volatilityAnnualized < 0.12 ? "good" : metrics.volatilityAnnualized < 0.25 ? "warn" : "danger",
    },
    {
      label: "Max Drawdown",
      value: fmtPct(metrics.maxDrawdownPct),
      tooltip: "Largest peak-to-trough decline",
      sentiment: Math.abs(metrics.maxDrawdownPct) < 0.1 ? "good" : Math.abs(metrics.maxDrawdownPct) < 0.25 ? "warn" : "danger",
    },
    {
      label: "Tracking Error",
      value: fmtPct(metrics.trackingError),
      tooltip: "Deviation of returns from the benchmark",
    },
    {
      label: "Info. Ratio",
      value: fmt(metrics.informationRatio),
      tooltip: "Active return per unit of tracking error",
      sentiment: ratioSentiment(metrics.informationRatio),
    },
  ];

  return (
    <div className="rmc card card--elevated">
      <div className="rmc__header">
        <h3 className="rmc__title">Risk Metrics</h3>
        <span className="rmc__date">
          As of {new Date(metrics.calculatedAt).toLocaleString()}
        </span>
      </div>

      <div className="rmc__grid">
        {items.map((item) => (
          <div key={item.label} className="rmc__item" title={item.tooltip}>
            <span className="rmc__item-label">{item.label}</span>
            <span className="rmc__item-value" style={{ color: sentimentClass(item.sentiment) }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .rmc__header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 1.25rem;
        }
        .rmc__title { font-size: 1rem; font-weight: 700; }
        .rmc__date { font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); }
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
          padding: 0.875rem 1rem;
          display: flex; flex-direction: column; gap: 0.3rem;
          cursor: default;
          transition: background 0.12s;
        }
        .rmc__item:hover { background: var(--bg-overlay); }
        .rmc__item-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .rmc__item-value {
          font-family: var(--font-mono);
          font-size: 1.05rem;
          font-weight: 500;
        }
        /* Skeleton */
        .rmc__skeleton {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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