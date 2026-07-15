// frontend/components/simulation/SimulationResultsData.tsx
// Rewritten to match backend API contract

import React from "react";
import type { SimulationResult } from "../../services/simulationApi";

interface Props {
  results: SimulationResult;
}

function fmtCurrency(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD", 
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(n);
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100 >= 0 ? "+" : "")}${(n * 100).toFixed(2)}%`;
}

export const SimulationResultsData: React.FC<Props> = ({ results }) => {
  const initialValue = results.initialValue || 0;
  const expectedFinal = results.expectedFinalValue || 0;
  const gainLoss = expectedFinal - initialValue;
  const gainLossPct = initialValue > 0 ? gainLoss / initialValue : 0;
  const isPositive = gainLoss >= 0;

  const mainStats = [
    { label: "Initial Value", value: fmtCurrency(initialValue) },
    { label: "Expected Final", value: fmtCurrency(expectedFinal), highlight: true, sentiment: isPositive ? "pos" : "neg" },
    { label: "Median Final", value: fmtCurrency(results.finalValues?.p50 || 0) },
    { label: "Expected Return", value: fmtPct(gainLossPct), sentiment: isPositive ? "pos" : "neg" },
    { label: "P5 Outcome", value: fmtCurrency(results.finalValues?.p5 || 0), sentiment: "neg" },
    { label: "P95 Outcome", value: fmtCurrency(results.finalValues?.p95 || 0), sentiment: "pos" },
    { label: "Simulations", value: results.numSimulations?.toLocaleString() || "0" },
  ];

  const riskStats = [
    {
      label: "Probability of Loss",
      value: results.probabilityOfLoss != null ? `${(results.probabilityOfLoss * 100).toFixed(1)}%` : "—",
      sentiment: results.probabilityOfLoss != null && results.probabilityOfLoss > 0.5 ? "neg" : 
                 results.probabilityOfLoss != null && results.probabilityOfLoss > 0.2 ? "warn" : "pos",
    },
    {
      label: `VaR (95%)`,
      value: fmtCurrency(results.varDollar || 0),
      sentiment: "neg",
    },
    {
      label: "CVaR (Expected Shortfall)",
      value: fmtCurrency(results.cvarDollar || 0),
      sentiment: "neg",
    },
  ];

  const sentimentColor = (s?: string): string => {
    if (s === "pos") return "var(--green-bright)";
    if (s === "neg") return "var(--red-bright)";
    if (s === "warn") return "var(--yellow-bright)";
    return "var(--text-primary)";
  };

  // Percentile data from finalValues
  const percentiles = results.finalValues ? [
    { p: 5, value: results.finalValues.p5 },
    { p: 10, value: results.finalValues.p10 },
    { p: 25, value: results.finalValues.p25 },
    { p: 50, value: results.finalValues.p50 },
    { p: 75, value: results.finalValues.p75 },
    { p: 90, value: results.finalValues.p90 },
    { p: 95, value: results.finalValues.p95 },
  ] : [];

  return (
    <div className="sr">
      <div className="sr__header">
        <h3 className="sr__title">Simulation Results</h3>
        <div className="sr__meta">
          <span className="badge badge-cyan">GBM</span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {results.numSimulations?.toLocaleString() || 0} paths · {results.timeHorizon || 0}d horizon
          </span>
        </div>
      </div>

      <div className="sr__grid">
        {mainStats.map((s) => (
          <div key={s.label} className={`sr__stat ${s.highlight ? "sr__stat--highlight" : ""}`}>
            <span className="sr__stat-label">{s.label}</span>
            <span className="sr__stat-value" style={{ color: sentimentColor(s.sentiment) }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      <div className="sr__risk-title">Risk Metrics</div>
      <div className="sr__risk-grid">
        {riskStats.map((s) => (
          <div key={s.label} className="sr__risk-item">
            <span className="sr__stat-label">{s.label}</span>
            <span className="sr__stat-value" style={{ color: sentimentColor(s.sentiment), fontSize: "1.1rem" }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {percentiles.length > 0 && (
        <div className="sr__percentiles">
          <div className="sr__risk-title">Percentile Outcomes (Final Value)</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Percentile</th>
                <th style={{ textAlign: "right" }}>Final Value</th>
                <th style={{ textAlign: "right" }}>Return</th>
              </tr>
            </thead>
            <tbody>
              {percentiles.map((p) => {
                const ret = initialValue > 0 ? (p.value - initialValue) / initialValue : 0;
                return (
                  <tr key={p.p}>
                    <td>
                      <span className="badge badge-blue">P{p.p}</span>
                    </td>
                    <td className="num">{fmtCurrency(p.value)}</td>
                    <td className="num">
                      <span className={ret >= 0 ? "pos" : "neg"} style={{ color: ret >= 0 ? "var(--green-bright)" : "var(--red-bright)" }}>
                        {fmtPct(ret)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .sr__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 8px; }
        .sr__title { font-size: 1rem; font-weight: 700; font-family: var(--font-display); }
        .sr__meta { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .sr__grid {
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 1px; 
          background: var(--border-subtle);
          border: 1px solid var(--border-subtle); 
          border-radius: var(--radius-lg);
          overflow: hidden; 
          margin-bottom: 1.25rem;
        }
        .sr__stat { background: var(--bg-elevated); padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
        .sr__stat--highlight { background: var(--bg-overlay); }
        .sr__stat-label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); font-family: var(--font-mono); }
        .sr__stat-value { font-family: var(--font-mono); font-size: 0.9rem; font-weight: 500; }
        .sr__risk-title { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 0.75rem; }
        .sr__risk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
        .sr__risk-item { background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
        .sr__percentiles { margin-top: 0.5rem; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
        .data-table thead { border-bottom: 1px solid var(--border-subtle); }
        .data-table th { text-align: left; padding: 8px; color: var(--text-muted); font-weight: 500; font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase; }
        .data-table td { padding: 8px; border-bottom: 1px solid var(--border-subtle); color: var(--text-secondary); }
        .num { text-align: right; font-family: var(--font-mono); }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; font-family: var(--font-mono); font-weight: 500; border: 1px solid var(--border-subtle); }
        .badge-blue { background: rgba(77, 171, 247, 0.1); color: var(--blue); border-color: rgba(77, 171, 247, 0.2); }
        .badge-cyan { background: rgba(0, 229, 204, 0.1); color: var(--cyan); border-color: rgba(0, 229, 204, 0.2); }
        .pos { color: var(--green-bright); }
        .neg { color: var(--red-bright); }
        @media (max-width: 600px) {
          .sr__risk-grid { grid-template-columns: 1fr 1fr; }
          .sr__grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 400px) {
          .sr__risk-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};