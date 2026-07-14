import React from "react";
import type { SimulationResults } from "../../types/simulation";

interface Props {
  results: SimulationResults;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) {
  return `${(n * 100 >= 0 ? "+" : "")}${(n * 100).toFixed(2)}%`;
}

export const SimulationResultsData : React.FC<Props> = ({ results }) => {
  const gainLoss = results.meanFinalValue - results.initialValue;
  const gainLossPct = gainLoss / results.initialValue;
  const isPositive = gainLoss >= 0;

  const mainStats = [
    { label: "Initial Value",    value: fmtCurrency(results.initialValue),      highlight: false },
    { label: "Mean Final Value", value: fmtCurrency(results.meanFinalValue),     highlight: true, sentiment: isPositive ? "pos" : "neg" },
    { label: "Median Final",     value: fmtCurrency(results.medianFinalValue),   highlight: false },
    { label: "Expected Return",  value: fmtPct(gainLossPct),                     highlight: false, sentiment: isPositive ? "pos" : "neg" },
    { label: "Std Deviation",    value: fmtCurrency(results.stdDevFinalValue),   highlight: false },
    { label: "Worst Case",       value: fmtCurrency(results.minFinalValue),      highlight: false, sentiment: "neg" },
    { label: "Best Case",        value: fmtCurrency(results.maxFinalValue),      highlight: false, sentiment: "pos" },
    { label: "Simulations",      value: results.params.numSimulations.toLocaleString(), highlight: false },
  ];

  const riskStats = [
    {
      label: "Probability of Loss",
      value: `${(results.probabilityOfLoss * 100).toFixed(1)}%`,
      sentiment: results.probabilityOfLoss > 0.5 ? "neg" : results.probabilityOfLoss > 0.2 ? "warn" : "pos",
    },
    {
      label: "Prob. of Doubling",
      value: `${(results.probabilityOfDoublingPortfolio * 100).toFixed(1)}%`,
      sentiment: results.probabilityOfDoublingPortfolio > 0.3 ? "pos" : "neutral",
    },
    {
      label: `VaR (${(results.params.confidenceLevel * 100).toFixed(0)}%)`,
      value: fmtCurrency(results.simulationVaR),
      sentiment: "neg",
    },
    {
      label: "Expected Shortfall",
      value: fmtCurrency(results.expectedShortfall),
      sentiment: "neg",
    },
  ];

  const sentimentColor = (s?: string) => {
    if (s === "pos")  return "var(--green)";
    if (s === "neg")  return "var(--red)";
    if (s === "warn") return "var(--yellow)";
    return "var(--text-primary)";
  };

  return (
    <div className="sr">
      {/* Header */}
      <div className="sr__header">
        <h3 className="sr__title">Simulation Results</h3>
        <div className="sr__meta">
          <span className="badge badge-cyan">{results.params.method.replace(/_/g, " ")}</span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {new Date(results.completedAt).toLocaleString()} · {(results.durationMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Main stats */}
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

      {/* Risk stats */}
      <div className="sr__risk-title">Probability Metrics</div>
      <div className="sr__risk-grid">
        {riskStats.map((s) => (
          <div key={s.label} className="sr__risk-item">
            <span className="sr__stat-label">{s.label}</span>
            <span className="sr__stat-value" style={{ color: sentimentColor(s.sentiment), fontSize: "1.3rem" }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Percentile table */}
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
            {results.percentiles.map((p) => {
              const ret = (p.finalValue - results.initialValue) / results.initialValue;
              return (
                <tr key={p.percentile}>
                  <td>
                    <span className="badge badge-blue">P{p.percentile}</span>
                  </td>
                  <td className="num">{fmtCurrency(p.finalValue)}</td>
                  <td className="num">
                    <span className={ret >= 0 ? "pos" : "neg"}>{fmtPct(ret)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        .sr__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
        .sr__title { font-size: 1rem; font-weight: 700; }
        .sr__meta { display: flex; align-items: center; gap: 0.75rem; }
        .sr__grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(140px,1fr));
          gap: 1px; background: var(--border-subtle);
          border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);
          overflow: hidden; margin-bottom: 1.25rem;
        }
        .sr__stat { background: var(--bg-elevated); padding: 0.875rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .sr__stat--highlight { background: var(--bg-overlay); }
        .sr__stat-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); font-family: var(--font-mono); }
        .sr__stat-value { font-family: var(--font-mono); font-size: 0.95rem; font-weight: 500; }
        .sr__risk-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 0.75rem; }
        .sr__risk-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
        .sr__risk-item { background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.3rem; }
        .sr__percentiles { margin-top: 0.5rem; }
      `}</style>
    </div>
  );
};