// frontend/components/simulation/DistributionChart.tsx
// Rewritten to match backend API contract

import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { SimulationResult } from "../../services/simulationApi";

interface Props {
  results: SimulationResult;
}

type ChartMode = "fan" | "histogram";

function fmtCurrency(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD", 
    notation: "compact", 
    maximumFractionDigits: 1 
  }).format(n);
}

const FAN_COLORS: Record<number, string> = {
  5: "rgba(77,124,254,0.15)",
  25: "rgba(77,124,254,0.25)",
  50: "rgba(0,229,204,0.40)",
  75: "rgba(77,124,254,0.25)",
  95: "rgba(77,124,254,0.15)",
};

const HistTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-overlay)", border: "1px solid var(--border-base)", borderRadius: 8, padding: "0.6rem 0.9rem", fontSize: "0.8rem" }}>
      <div style={{ color: "var(--text-secondary)", fontFamily: "'DM Mono',monospace" }}>
        Return: {label}%
      </div>
      <div style={{ color: "var(--cyan)", fontFamily: "'DM Mono',monospace" }}>
        Count: {payload[0]?.value}
      </div>
    </div>
  );
};

export const DistributionChart: React.FC<Props> = ({ results }) => {
  const [mode, setMode] = useState<ChartMode>("fan");

  // ── Fan / Percentile Paths from pathsSample ──────────────────────────────
  const fanData = useMemo(() => {
    if (!results.pathsSample || results.pathsSample.length === 0) return [];

    const paths = results.pathsSample;
    const numPaths = paths.length;
    const numDays = paths[0]?.length || 0;

    if (numDays === 0 || numPaths === 0) return [];

    const data = [];
    for (let day = 0; day < numDays; day++) {
      const valuesAtDay = paths.map(path => path[day]).filter(v => v !== undefined && Number.isFinite(v));
      if (valuesAtDay.length === 0) continue;
      
      const sorted = [...valuesAtDay].sort((a, b) => a - b);
      const p5 = sorted[Math.floor(0.05 * sorted.length)];
      const p25 = sorted[Math.floor(0.25 * sorted.length)];
      const p50 = sorted[Math.floor(0.50 * sorted.length)];
      const p75 = sorted[Math.floor(0.75 * sorted.length)];
      const p95 = sorted[Math.floor(0.95 * sorted.length)];
      
      data.push({ day, p5, p25, p50, p75, p95 });
    }
    return data;
  }, [results.pathsSample]);

  // ── Histogram data from pathsSample ────────────────────────────────────
  const histData = useMemo(() => {
    if (!results.pathsSample || results.pathsSample.length === 0) return [];
    
    const finalValues = results.pathsSample.map(path => path[path.length - 1]).filter(v => Number.isFinite(v));
    if (finalValues.length === 0) return [];

    const initialValue = results.initialValue || 100000;
    const returns = finalValues.map(v => (v - initialValue) / initialValue);
    
    const min = Math.min(...returns);
    const max = Math.max(...returns);
    const binCount = 20;
    const binWidth = (max - min) / binCount;
    
    const bins = Array.from({ length: binCount }, (_, i) => ({
      bin: min + i * binWidth,
      count: 0,
      isLoss: (min + i * binWidth) < 0,
    }));
    
    returns.forEach(r => {
      const idx = Math.min(Math.floor((r - min) / binWidth), binCount - 1);
      if (idx >= 0) bins[idx].count++;
    });
    
    return bins.map(b => ({
      bin: (b.bin * 100).toFixed(1),
      count: b.count,
      isLoss: b.isLoss,
    }));
  }, [results.pathsSample, results.initialValue]);

  const initialValue = results.initialValue || 0;
  const meanReturn = results.expectedFinalValue != null 
    ? ((results.expectedFinalValue - initialValue) / initialValue) * 100 
    : 0;

  if (fanData.length === 0 && histData.length === 0) {
    return (
      <div className="dc card card--elevated">
        <div className="dc__header">
          <h3 className="dc__title">Return Distribution</h3>
        </div>
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
          No distribution data available
        </div>
      </div>
    );
  }

  return (
    <div className="dc card card--elevated">
      <div className="dc__header">
        <h3 className="dc__title">Return Distribution</h3>
        <div style={{ display: "flex", gap: 2, background: "var(--bg-base)", borderRadius: "var(--radius-md)", padding: 2 }}>
          {(["fan", "histogram"] as ChartMode[]).map((m) => (
            <button
              key={m}
              className={`vcd__toggle ${mode === m ? "vcd__toggle--active" : ""}`}
              onClick={() => setMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === "fan" ? (
            <AreaChart data={fanData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis 
                dataKey="day" 
                tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "'DM Mono',monospace" }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(v) => `D${v}`} 
                interval={Math.floor(fanData.length / 8)} 
              />
              <YAxis 
                tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "'DM Mono',monospace" }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={fmtCurrency} 
              />
              <Tooltip 
                formatter={(v: number) => fmtCurrency(v)} 
                contentStyle={{ 
                  background: "var(--bg-overlay)", 
                  border: "1px solid var(--border-base)", 
                  borderRadius: 8, 
                  fontSize: "0.78rem" 
                }} 
                labelStyle={{ color: "var(--text-muted)" }} 
              />
              <ReferenceLine 
                y={initialValue} 
                stroke="rgba(255,255,255,0.15)" 
                strokeDasharray="4 4" 
                label={{ value: "Initial", fill: "var(--text-muted)", fontSize: 10 }} 
              />
              {[5, 25, 50, 75, 95].map((pct) => (
                <Area 
                  key={pct} 
                  type="monotone" 
                  dataKey={`p${pct}`} 
                  stroke={pct === 50 ? "var(--cyan)" : "var(--blue)"} 
                  strokeWidth={pct === 50 ? 2 : 1} 
                  fill={FAN_COLORS[pct]} 
                  name={`P${pct}`} 
                  dot={false} 
                  activeDot={false} 
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={histData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis 
                dataKey="bin" 
                tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "'DM Mono',monospace" }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(v) => `${v}%`} 
                interval={Math.floor(histData.length / 8)} 
              />
              <YAxis 
                tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "'DM Mono',monospace" }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip content={<HistTooltip />} />
              <ReferenceLine 
                x={meanReturn.toFixed(1)} 
                stroke="var(--cyan)" 
                strokeDasharray="4 2" 
                label={{ value: "Mean", fill: "var(--cyan)", fontSize: 10 }} 
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {histData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.isLoss ? "var(--red-bright)" : "var(--cyan)"} opacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Dist stats */}
      <div className="dc__stats">
        {[
          { label: "Mean Return", value: `${meanReturn >= 0 ? "+" : ""}${meanReturn.toFixed(2)}%` },
          { label: "P50 (Median)", value: fmtCurrency(results.finalValues?.p50 || 0) },
          { label: "VaR", value: fmtCurrency(results.varDollar || 0) },
          { label: "CVaR", value: fmtCurrency(results.cvarDollar || 0) },
        ].map((s) => (
          <div key={s.label} className="dc__stat">
            <span className="dc__stat-label">{s.label}</span>
            <span className="dc__stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      <style>{`
        .dc__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px; }
        .dc__title { font-size: 1rem; font-weight: 700; font-family: var(--font-display); }
        .dc__stats { display: flex; gap: 1.5rem; margin-top: 0.75rem; flex-wrap: wrap; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; }
        .dc__stat { display: flex; flex-direction: column; gap: 0.2rem; }
        .dc__stat-label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); font-family: var(--font-mono); }
        .dc__stat-value { font-family: var(--font-mono); font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
        .vcd__toggle {
          padding: 0.3rem 0.7rem; font-size: 0.72rem; font-family: var(--font-mono);
          border: none; background: transparent; color: var(--text-muted);
          border-radius: calc(var(--radius-md) - 2px); cursor: pointer; transition: all 0.15s;
        }
        .vcd__toggle:hover { color: var(--text-primary); background: var(--bg-elevated); }
        .vcd__toggle--active { background: var(--bg-overlay); color: var(--cyan); }
        @media (max-width: 600px) {
          .dc__stats { gap: 0.75rem; }
          .dc__stat { flex: 1; min-width: 80px; }
        }
      `}</style>
    </div>
  );
};