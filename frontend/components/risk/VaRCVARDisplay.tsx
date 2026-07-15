// frontend/components/risk/VaRCVaRDisplay.tsx
// Rewritten to match backend API contract (single object, not array)

import React, { useState } from "react";
import type { RiskMetrics } from "../../types/risk";

interface Props {
  metrics: RiskMetrics;
  portfolioValue: number;
}

type Horizon = 1 | 5 | 21 | 63 | 252;
type Confidence = 0.90 | 0.95 | 0.99;

const HORIZONS: { value: Horizon; label: string }[] = [
  { value: 1, label: "1D" },
  { value: 5, label: "5D" },
  { value: 21, label: "1M" },
  { value: 63, label: "3M" },
  { value: 252, label: "1Y" },
];

const CONFIDENCES: { value: Confidence; label: string }[] = [
  { value: 0.90, label: "90%" },
  { value: 0.95, label: "95%" },
  { value: 0.99, label: "99%" },
];

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
  return `${(n * 100).toFixed(2)}%`;
}

export const VaRCVaRDisplay: React.FC<Props> = ({ metrics, portfolioValue }) => {
  const [horizon, setHorizon] = useState<Horizon>(1);
  const [confidence, setConfidence] = useState<Confidence>(0.95);

  // Backend returns single objects, not arrays
  const varResult = metrics?.var;
  const cvarResult = metrics?.cvar;

  // Scale VaR/CVaR for different horizons (sqrt of time)
  const horizonScale = Math.sqrt(horizon);
  const scaledVarDollar = varResult?.varDollar != null ? varResult.varDollar * horizonScale : null;
  const scaledCvarDollar = cvarResult?.cvarDollar != null ? cvarResult.cvarDollar * horizonScale : null;
  const scaledVarPct = varResult?.varPct != null ? varResult.varPct * horizonScale : null;
  const scaledCvarPct = cvarResult?.cvarPct != null ? cvarResult.cvarPct * horizonScale : null;

  const maxLoss = Math.max(scaledVarDollar || 0, scaledCvarDollar || 0);

  return (
    <div className="vcd card card--elevated">
      <div className="vcd__header">
        <h3 className="vcd__title">VaR &amp; CVaR</h3>
      </div>

      {/* Controls */}
      <div className="vcd__controls">
        <div className="vcd__toggle-group">
          <span className="vcd__control-label">Horizon</span>
          <div className="vcd__toggles">
            {HORIZONS.map((h) => (
              <button
                key={h.value}
                className={`vcd__toggle ${horizon === h.value ? "vcd__toggle--active" : ""}`}
                onClick={() => setHorizon(h.value)}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div className="vcd__toggle-group">
          <span className="vcd__control-label">Confidence</span>
          <div className="vcd__toggles">
            {CONFIDENCES.map((c) => (
              <button
                key={c.value}
                className={`vcd__toggle ${confidence === c.value ? "vcd__toggle--active" : ""}`}
                onClick={() => setConfidence(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="vcd__results">
        <div className="vcd__metric vcd__metric--var">
          <span className="vcd__metric-label">Value at Risk (VaR)</span>
          <span className="vcd__metric-main">
            {scaledVarDollar != null ? fmtCurrency(scaledVarDollar) : "—"}
          </span>
          <span className="vcd__metric-sub">
            {scaledVarPct != null ? `${fmtPct(scaledVarPct)} of portfolio` : "Not available"}
          </span>
          <p className="vcd__metric-desc">
            With {(confidence * 100).toFixed(0)}% confidence, max {horizon}-day loss will not exceed this amount.
          </p>
        </div>

        <div className="vcd__metric vcd__metric--cvar">
          <span className="vcd__metric-label">Conditional VaR (CVaR / ES)</span>
          <span className="vcd__metric-main">
            {scaledCvarDollar != null ? fmtCurrency(scaledCvarDollar) : "—"}
          </span>
          <span className="vcd__metric-sub">
            {scaledCvarPct != null ? `${fmtPct(scaledCvarPct)} of portfolio` : "Not available"}
          </span>
          <p className="vcd__metric-desc">
            Expected loss in the worst {(100 - confidence * 100).toFixed(0)}% of scenarios.
          </p>
        </div>
      </div>

      {/* Visual bar */}
      {maxLoss > 0 && portfolioValue > 0 && (
        <div className="vcd__bar-wrap">
          <div className="vcd__bar-track">
            <div
              className="vcd__bar-var"
              style={{ width: `${Math.min((scaledVarDollar || 0) / portfolioValue * 200, 70)}%` }}
            />
            <div
              className="vcd__bar-cvar"
              style={{ width: `${Math.min((scaledCvarDollar || 0) / portfolioValue * 200, 95)}%` }}
            />
          </div>
          <div className="vcd__bar-labels">
            <span>0%</span>
            <span style={{ color: "var(--cyan)" }}>VaR</span>
            <span style={{ color: "var(--red-bright)" }}>CVaR</span>
            <span>{((Math.max(scaledVarDollar || 0, scaledCvarDollar || 0) / portfolioValue) * 200).toFixed(0)}%+</span>
          </div>
        </div>
      )}

      <style>{`
        .vcd__header { margin-bottom: 1rem; }
        .vcd__title { font-size: 1rem; font-weight: 700; font-family: var(--font-display); }
        .vcd__controls { display: flex; flex-wrap: wrap; gap: 1.25rem; margin-bottom: 1.25rem; }
        .vcd__toggle-group { display: flex; align-items: center; gap: 0.625rem; flex-wrap: wrap; }
        .vcd__control-label {
          font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.07em;
          color: var(--text-muted); font-family: var(--font-mono);
        }
        .vcd__toggles { display: flex; gap: 2px; background: var(--bg-base); border-radius: var(--radius-md); padding: 2px; }
        .vcd__toggle {
          padding: 0.3rem 0.7rem; font-size: 0.72rem; font-family: var(--font-mono);
          border: none; background: transparent; color: var(--text-muted);
          border-radius: calc(var(--radius-md) - 2px); cursor: pointer; transition: all 0.15s;
        }
        .vcd__toggle:hover { color: var(--text-primary); background: var(--bg-elevated); }
        .vcd__toggle--active { background: var(--bg-overlay); color: var(--cyan); }
        .vcd__results { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 1rem; }
        .vcd__metric { background: var(--bg-elevated); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .vcd__metric-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); font-family: var(--font-mono); }
        .vcd__metric--var .vcd__metric-main { color: var(--cyan); font-family: var(--font-mono); font-size: 1.6rem; font-weight: 500; }
        .vcd__metric--cvar .vcd__metric-main { color: var(--red-bright); font-family: var(--font-mono); font-size: 1.6rem; font-weight: 500; }
        .vcd__metric-sub { font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-secondary); }
        .vcd__metric-desc { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.5rem; line-height: 1.4; }
        .vcd__bar-wrap { display: flex; flex-direction: column; gap: 0.3rem; }
        .vcd__bar-track { position: relative; height: 8px; background: var(--bg-base); border-radius: 4px; overflow: hidden; }
        .vcd__bar-var { position: absolute; left: 0; top: 0; height: 100%; background: var(--cyan); border-radius: 4px; opacity: 0.7; transition: width 0.4s ease; }
        .vcd__bar-cvar { position: absolute; left: 0; top: 0; height: 100%; background: var(--red-bright); border-radius: 4px; opacity: 0.4; transition: width 0.4s ease; }
        .vcd__bar-labels { display: flex; justify-content: space-between; font-size: 0.62rem; color: var(--text-muted); font-family: var(--font-mono); }
        @media (max-width: 600px) {
          .vcd__results { grid-template-columns: 1fr; }
          .vcd__controls { flex-direction: column; gap: 0.75rem; }
        }
      `}</style>
    </div>
  );
};