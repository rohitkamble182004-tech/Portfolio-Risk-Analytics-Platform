// frontend/components/simulation/MonteCarloControls.tsx
// Rewritten to match backend API contract (simplified)

import React, { useState } from "react";

interface Props {
  portfolioId: string;
  onRun: (params: {
    numSimulations: number;
    horizonDays: number;
    confidenceLevel: number;
  }) => void;
  onCancel?: () => void;
  isRunning?: boolean;
}

export const MonteCarloControls: React.FC<Props> = ({
  onRun,
  onCancel,
  isRunning,
}) => {
  const [numSims, setNumSims] = useState(5000);
  const [horizonDays, setHorizonDays] = useState(252);
  const [confidence, setConfidence] = useState(0.95);

  const handleRun = () => {
    onRun({
      numSimulations: numSims,
      horizonDays,
      confidenceLevel: confidence,
    });
  };

  return (
    <div className="mcc card card--elevated">
      <h3 className="mcc__title">Monte Carlo Settings</h3>

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
          <label className="form-label">Horizon (days)</label>
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
      </div>

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
        .mcc__title { font-size: 1rem; font-weight: 700; font-family: var(--font-display); margin-bottom: 1.25rem; }
        .mcc__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
        .mcc__actions { display: flex; justify-content: flex-end; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-label { font-size: 0.68rem; font-weight: 500; color: var(--text-secondary); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.05em; }
        .form-select {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 6px 10px;
          color: var(--text-primary);
          font-size: 0.85rem;
          font-family: var(--font-mono);
          outline: none;
          width: 100%;
        }
        .form-select:focus { border-color: var(--cyan); }
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-family: var(--font-mono);
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: none;
          font-weight: 500;
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
        .btn-danger {
          background: rgba(255, 107, 107, 0.1);
          border-color: rgba(255, 107, 107, 0.2);
          color: var(--red-bright);
        }
        .btn-danger:hover {
          background: rgba(255, 107, 107, 0.2);
        }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
};