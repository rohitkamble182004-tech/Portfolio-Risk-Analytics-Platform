import React, { useState } from "react";
import type { MonteCarloParams } from "../../types/simulation";

interface Props {
  portfolioId: string;
  onRun: (params: Omit<MonteCarloParams, "portfolioId">) => void;
  onCancel?: () => void;
  isRunning?: boolean;
  progress?: number;
}

type Method = MonteCarloParams["method"];

const METHODS: { value: Method; label: string; desc: string }[] = [
  { value: "geometric_brownian",   label: "GBM",       desc: "Geometric Brownian Motion — assumes log-normal returns" },
  { value: "historical_bootstrap", label: "Bootstrap",  desc: "Resamples actual historical return sequences" },
  { value: "factor_model",         label: "Factor",     desc: "Multi-factor model with systematic & idiosyncratic risk" },
];

export const MonteCarloControls: React.FC<Props> = ({
  portfolioId,
  onRun,
  onCancel,
  isRunning,
  progress = 0,
}) => {
  const [numSims, setNumSims]         = useState(5000);
  const [horizonDays, setHorizonDays] = useState(252);
  const [confidence, setConfidence]   = useState(0.95);
  const [method, setMethod]           = useState<Method>("geometric_brownian");
  const [rebalance, setRebalance]     = useState(false);
  const [rebalFreq, setRebalFreq]     = useState(21);
  const [contribution, setContribution] = useState(0);
  const [withdrawal, setWithdrawal]   = useState(0);

  const handleRun = () => {
    onRun({
      numSimulations: numSims,
      horizonDays,
      confidenceLevel: confidence,
      method,
      includeRebalancing: rebalance,
      rebalanceFrequencyDays: rebalance ? rebalFreq : undefined,
      annualContribution: contribution || undefined,
      annualWithdrawal: withdrawal || undefined,
    });
  };

  return (
    <div className="mcc card card--elevated">
      <h3 className="mcc__title">Monte Carlo Settings</h3>

      {/* Method selector */}
      <div className="mcc__section">
        <span className="mcc__section-label">Simulation Method</span>
        <div className="mcc__method-cards">
          {METHODS.map((m) => (
            <button
              key={m.value}
              className={`mcc__method-card ${method === m.value ? "mcc__method-card--active" : ""}`}
              onClick={() => setMethod(m.value)}
              disabled={isRunning}
            >
              <span className="mcc__method-name">{m.label}</span>
              <span className="mcc__method-desc">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Numeric params */}
      <div className="mcc__grid">
        <div className="form-group">
          <label className="form-label">Simulations</label>
          <select
            className="form-select"
            value={numSims}
            onChange={(e) => setNumSims(Number(e.target.value))}
            disabled={isRunning}
          >
            {[1000, 2500, 5000, 10000, 25000].map((n) => (
              <option key={n} value={n}>{n.toLocaleString()}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Horizon</label>
          <select
            className="form-select"
            value={horizonDays}
            onChange={(e) => setHorizonDays(Number(e.target.value))}
            disabled={isRunning}
          >
            {[21, 63, 126, 252, 504, 756].map((d) => (
              <option key={d} value={d}>
                {d === 21 ? "1 Month" : d === 63 ? "3 Months" : d === 126 ? "6 Months" : d === 252 ? "1 Year" : d === 504 ? "2 Years" : "3 Years"}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Confidence Level</label>
          <select
            className="form-select"
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            disabled={isRunning}
          >
            <option value={0.90}>90%</option>
            <option value={0.95}>95%</option>
            <option value={0.99}>99%</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Annual Contribution ($)</label>
          <input
            type="number" className="form-input" min={0} step={1000}
            value={contribution || ""} placeholder="0"
            onChange={(e) => setContribution(Number(e.target.value) || 0)}
            disabled={isRunning}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Annual Withdrawal ($)</label>
          <input
            type="number" className="form-input" min={0} step={1000}
            value={withdrawal || ""} placeholder="0"
            onChange={(e) => setWithdrawal(Number(e.target.value) || 0)}
            disabled={isRunning}
          />
        </div>
      </div>

      {/* Rebalancing toggle */}
      <div className="mcc__rebal">
        <label className="mcc__check-label">
          <input
            type="checkbox"
            checked={rebalance}
            onChange={(e) => setRebalance(e.target.checked)}
            disabled={isRunning}
          />
          <span>Include periodic rebalancing</span>
        </label>
        {rebalance && (
          <div className="form-group" style={{ marginTop: "0.5rem", maxWidth: 200 }}>
            <label className="form-label">Rebalance every N days</label>
            <input
              type="number" className="form-input" min={5} step={1}
              value={rebalFreq}
              onChange={(e) => setRebalFreq(Number(e.target.value))}
              disabled={isRunning}
            />
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="mcc__progress">
          <div className="mcc__progress-header">
            <span>Running simulation…</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{progress}%</span>
          </div>
          <div className="mcc__progress-track">
            <div className="mcc__progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mcc__actions">
        {isRunning ? (
          <button className="btn btn-danger" onClick={onCancel}>Cancel</button>
        ) : (
          <button className="btn btn-primary" onClick={handleRun}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Run Simulation
          </button>
        )}
      </div>

      <style>{`
        .mcc__title { font-size: 1rem; font-weight: 700; margin-bottom: 1.25rem; }
        .mcc__section { margin-bottom: 1.25rem; }
        .mcc__section-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); font-family: var(--font-mono); display: block; margin-bottom: 0.5rem; }
        .mcc__method-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.5rem; }
        .mcc__method-card {
          background: var(--bg-elevated); border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md); padding: 0.75rem; text-align: left;
          cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; gap: 0.25rem;
        }
        .mcc__method-card:hover { border-color: var(--border-strong); }
        .mcc__method-card--active { border-color: var(--accent-cyan); background: var(--accent-cyan-dim); }
        .mcc__method-name { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
        .mcc__method-desc { font-size: 0.72rem; color: var(--text-muted); line-height: 1.4; }
        .mcc__method-card--active .mcc__method-name { color: var(--accent-cyan); }
        .mcc__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 0.75rem; margin-bottom: 1rem; }
        .mcc__rebal { margin-bottom: 1rem; }
        .mcc__check-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; cursor: pointer; color: var(--text-secondary); }
        .mcc__check-label input { accent-color: var(--accent-cyan); }
        .mcc__progress { margin-bottom: 1rem; }
        .mcc__progress-header { display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.4rem; }
        .mcc__progress-track { height: 6px; background: var(--bg-base); border-radius: 3px; overflow: hidden; }
        .mcc__progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent-cyan), var(--accent-blue)); border-radius: 3px; transition: width 0.3s ease; }
        .mcc__actions { display: flex; justify-content: flex-end; }
      `}</style>
    </div>
  );
};