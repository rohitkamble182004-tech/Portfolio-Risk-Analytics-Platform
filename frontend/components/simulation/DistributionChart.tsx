import React, { useState } from "react";
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
import type { SimulationResults } from "../../types/simulation";
import { colors } from "../../styles/theme";

interface Props {
  results: SimulationResults;
}

type ChartMode = "fan" | "histogram";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);
}

const FAN_COLORS: Record<number, string> = {
  5:  "rgba(77,124,254,0.15)",
  25: "rgba(77,124,254,0.25)",
  50: "rgba(0,229,204,0.40)",
  75: "rgba(77,124,254,0.25)",
  95: "rgba(77,124,254,0.15)",
};

const HistTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: colors.bg.overlay, border: `1px solid ${colors.border.base}`, borderRadius: 8, padding: "0.6rem 0.9rem", fontSize: "0.8rem" }}>
      <div style={{ color: colors.text.secondary, fontFamily: "'DM Mono',monospace" }}>
        Return: {label}%
      </div>
      <div style={{ color: colors.accent.cyan, fontFamily: "'DM Mono',monospace" }}>
        Count: {payload[0]?.value}
      </div>
    </div>
  );
};

export const DistributionChart: React.FC<Props> = ({ results }) => {
  const [mode, setMode] = useState<ChartMode>("fan");

  // ── Fan / Percentile Paths ──────────────────────────────────────────────
  const fanData = React.useMemo(() => {
    const nPoints = results.percentiles[0]?.values.length ?? 0;
    const pMap: Record<number, number[]> = {};
    results.percentiles.forEach((p) => { pMap[p.percentile] = p.values; });

    return Array.from({ length: nPoints }, (_, i) => {
      const day = i;
      const point: Record<string, number> = { day };
      Object.entries(pMap).forEach(([pct, vals]) => {
        point[`p${pct}`] = vals[i] ?? 0;
      });
      return point;
    });
  }, [results.percentiles]);

  // ── Histogram data ────────────────────────────────────────────────────
  const histData = React.useMemo(() => {
    const { bins, frequencies } = results.distribution;
    return bins.slice(0, -1).map((bin, i) => ({
      bin: ((bin + bins[i + 1]) / 2 / results.initialValue * 100 - 100).toFixed(1),
      count: frequencies[i],
      isLoss: bin < results.initialValue,
    }));
  }, [results]);

  const { mean, median, stdDev } = results.distribution;
  const meanReturn = (mean / results.initialValue - 1) * 100;

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

      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === "fan" ? (
            <AreaChart data={fanData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border.subtle} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: colors.text.muted, fontSize: 10, fontFamily: "'DM Mono',monospace" }} axisLine={false} tickLine={false} tickFormatter={(v) => `D${v}`} interval={Math.floor(fanData.length / 6)} />
              <YAxis tick={{ fill: colors.text.muted, fontSize: 10, fontFamily: "'DM Mono',monospace" }} axisLine={false} tickLine={false} tickFormatter={fmtCurrency} />
              <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={{ background: colors.bg.overlay, border: `1px solid ${colors.border.base}`, borderRadius: 8, fontSize: "0.78rem" }} labelStyle={{ color: colors.text.muted }} />
              {[5, 25, 50, 75, 95].map((pct) => (
                <Area key={pct} type="monotone" dataKey={`p${pct}`} stroke={pct === 50 ? colors.accent.cyan : colors.accent.blue} strokeWidth={pct === 50 ? 2 : 0} fill={FAN_COLORS[pct]} name={`P${pct}`} dot={false} activeDot={false} />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={histData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border.subtle} vertical={false} />
              <XAxis dataKey="bin" tick={{ fill: colors.text.muted, fontSize: 10, fontFamily: "'DM Mono',monospace" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} interval={Math.floor(histData.length / 8)} />
              <YAxis tick={{ fill: colors.text.muted, fontSize: 10, fontFamily: "'DM Mono',monospace" }} axisLine={false} tickLine={false} />
              <Tooltip content={<HistTooltip />} />
              <ReferenceLine x={meanReturn.toFixed(1)} stroke={colors.accent.cyan} strokeDasharray="4 2" label={{ value: "Mean", fill: colors.accent.cyan, fontSize: 10 }} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {histData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.isLoss ? colors.semantic.red : colors.accent.cyan} opacity={0.7} />
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
          { label: "Median", value: fmtCurrency(median) },
          { label: "Std Dev", value: fmtCurrency(stdDev) },
          { label: "Skewness", value: results.distribution.skewness.toFixed(3) },
          { label: "Kurtosis", value: results.distribution.kurtosis.toFixed(3) },
        ].map((s) => (
          <div key={s.label} className="dc__stat">
            <span className="dc__stat-label">{s.label}</span>
            <span className="dc__stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      <style>{`
        .dc__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .dc__title { font-size: 1rem; font-weight: 700; }
        .dc__stats { display: flex; gap: 1.5rem; margin-top: 0.75rem; flex-wrap: wrap; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; }
        .dc__stat { display: flex; flex-direction: column; gap: 0.2rem; }
        .dc__stat-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); font-family: var(--font-mono); }
        .dc__stat-value { font-family: var(--font-mono); font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
      `}</style>
    </div>
  );
};