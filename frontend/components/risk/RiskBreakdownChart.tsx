import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { RiskBreakdownResponse } from "../../types/risk";
import { colors } from "../../styles/theme";

interface Props {
  breakdown: RiskBreakdownResponse;
  isLoading?: boolean;
}

type ViewMode = "contribution" | "marginal" | "beta";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: colors.bg.overlay,
      border: `1px solid ${colors.border.base}`,
      borderRadius: 8,
      padding: "0.75rem 1rem",
      fontFamily: colors.bg.base,
      fontSize: "0.8rem",
    }}>
      <div style={{ color: colors.text.primary, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, fontFamily: "'DM Mono', monospace" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(4) : p.value}
        </div>
      ))}
      {d && (
        <div style={{ color: colors.text.muted, marginTop: 4, fontSize: "0.72rem" }}>
          Systematic: {(d.systematicRisk * 100).toFixed(1)}% | Specific: {(d.specificRisk * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
};

export const RiskBreakdownChart: React.FC<Props> = ({ breakdown, isLoading }) => {
  const [view, setView] = React.useState<ViewMode>("contribution");

  const data = useMemo(() => {
    const sorted = [...breakdown.breakdown].sort(
      (a, b) => b.percentContribution - a.percentContribution
    );
    return sorted.map((b) => ({
      ticker: b.ticker,
      contribution: parseFloat((b.percentContribution * 100).toFixed(2)),
      marginalVaR: parseFloat(b.marginalVaR.toFixed(4)),
      beta: parseFloat(b.beta.toFixed(3)),
      systematicRisk: b.systematicRisk,
      specificRisk: b.specificRisk,
    }));
  }, [breakdown]);

  const viewConfig: Record<ViewMode, { key: string; label: string; color: string; suffix: string }> = {
    contribution: { key: "contribution", label: "% Contribution to VaR", color: colors.accent.cyan, suffix: "%" },
    marginal:     { key: "marginalVaR",  label: "Marginal VaR ($)",      color: colors.accent.blue, suffix: "" },
    beta:         { key: "beta",         label: "Beta",                   color: colors.semantic.yellow, suffix: "" },
  };

  const cfg = viewConfig[view];

  if (isLoading) {
    return (
      <div className="rbc card card--elevated" style={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="rbc card card--elevated">
      <div className="rbc__header">
        <h3 className="rbc__title">Risk Contribution Breakdown</h3>
        <div className="rbc__view-toggle">
          {(Object.keys(viewConfig) as ViewMode[]).map((v) => (
            <button
              key={v}
              className={`vcd__toggle ${view === v ? "vcd__toggle--active" : ""}`}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.border.subtle}
              vertical={false}
            />
            <XAxis
              dataKey="ticker"
              tick={{ fill: colors.text.muted, fontSize: 11, fontFamily: "'DM Mono',monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: colors.text.muted, fontSize: 10, fontFamily: "'DM Mono',monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}${cfg.suffix}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={cfg.key} name={cfg.label} radius={[4, 4, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={entry.ticker}
                  fill={cfg.color}
                  opacity={1 - idx * 0.06}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rbc__footer">
        Total Portfolio VaR: <strong style={{ color: colors.accent.cyan, fontFamily: "'DM Mono',monospace" }}>
          ${breakdown.totalVaR.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </strong>
      </div>

      <style>{`
        .rbc__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .rbc__title { font-size: 1rem; font-weight: 700; }
        .rbc__view-toggle { display: flex; gap: 2px; background: var(--bg-base); border-radius: var(--radius-md); padding: 2px; }
        .rbc__footer { margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono); }
      `}</style>
    </div>
  );
};