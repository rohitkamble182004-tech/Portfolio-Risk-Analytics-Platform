import React, { useState, useMemo } from "react";
import type { Holding } from "../../types/portfolio";

interface Props {
  holdings: Holding[];
  onRemove?: (holdingId: string) => void;
  onEdit?: (holding: Holding) => void;
  isLoading?: boolean;
}

type SortKey = keyof Holding;
type SortDir = "asc" | "desc";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

const ASSET_CLASS_COLORS: Record<string, string> = {
  equity:      "var(--accent-cyan)",
  bond:        "var(--accent-blue)",
  commodity:   "var(--yellow)",
  cash:        "var(--text-muted)",
  crypto:      "#a78bfa",
  alternative: "#fb923c",
};

export const PortfolioHoldingsTable: React.FC<Props> = ({
  holdings,
  onRemove,
  onEdit,
  isLoading,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>("weight");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState("");

  const sorted = useMemo(() => {
    const filtered = holdings.filter(
      (h) =>
        h.ticker.toLowerCase().includes(filter.toLowerCase()) ||
        h.name.toLowerCase().includes(filter.toLowerCase()) ||
        h.sector.toLowerCase().includes(filter.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [holdings, sortKey, sortDir, filter]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      <span style={{ opacity: 0.7, fontSize: "0.65rem" }}>{sortDir === "asc" ? "▲" : "▼"}</span>
    ) : (
      <span style={{ opacity: 0.2, fontSize: "0.65rem" }}>▼</span>
    );

  const cols: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "ticker",      label: "Ticker" },
    { key: "name",        label: "Name" },
    { key: "assetClass",  label: "Class" },
    { key: "sector",      label: "Sector" },
    { key: "quantity",    label: "Qty",         align: "right" },
    { key: "avgCost",     label: "Avg Cost",    align: "right" },
    { key: "currentPrice",label: "Price",       align: "right" },
    { key: "marketValue", label: "Mkt Value",   align: "right" },
    { key: "weight",      label: "Weight",      align: "right" },
    { key: "gainLossPct", label: "Return",      align: "right" },
  ];

  if (isLoading) {
    return (
      <div className="pht__loading">
        <span className="spinner" />
        <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading holdings…</span>
      </div>
    );
  }

  return (
    <div className="pht">
      <div className="pht__toolbar">
        <input
          type="text"
          className="form-input"
          placeholder="Filter by ticker, name, sector…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <span className="pht__count">{sorted.length} holdings</span>
      </div>

      <div className="pht__scroll">
        <table className="data-table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  style={{
                    textAlign: c.align ?? "left",
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label} <SortIcon col={c.key} />
                </th>
              ))}
              {(onEdit || onRemove) && <th />}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                  No holdings found.
                </td>
              </tr>
            ) : (
              sorted.map((h) => (
                <tr key={h.id}>
                  <td>
                    <span className="pht__ticker">{h.ticker}</span>
                  </td>
                  <td className="truncate" style={{ maxWidth: 180 }}>
                    <span title={h.name} style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      {h.name}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: `${ASSET_CLASS_COLORS[h.assetClass]}18`,
                        color: ASSET_CLASS_COLORS[h.assetClass],
                      }}
                    >
                      {h.assetClass}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{h.sector}</td>
                  <td className="num">{h.quantity.toLocaleString()}</td>
                  <td className="num">{fmtCurrency(h.avgCost)}</td>
                  <td className="num">{fmtCurrency(h.currentPrice)}</td>
                  <td className="num" style={{ fontWeight: 500 }}>{fmtCurrency(h.marketValue)}</td>
                  <td className="num">
                    <div className="pht__weight-cell">
                      <div
                        className="pht__weight-bar"
                        style={{ width: `${Math.min(h.weight * 100, 100)}%` }}
                      />
                      <span>{(h.weight * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="num">
                    <span className={h.gainLossPct >= 0 ? "pos" : "neg"}>
                      {fmtPct(h.gainLossPct)}
                    </span>
                  </td>
                  {(onEdit || onRemove) && (
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem", justifyContent: "flex-end" }}>
                        {onEdit && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => onEdit(h)}
                          >
                            Edit
                          </button>
                        )}
                        {onRemove && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => onRemove(h.id)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .pht { display: flex; flex-direction: column; gap: 0.75rem; }
        .pht__loading {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 2rem; justify-content: center;
        }
        .pht__toolbar {
          display: flex; align-items: center;
          justify-content: space-between; gap: 1rem;
        }
        .pht__count {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .pht__scroll { overflow-x: auto; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); }
        .pht__ticker {
          font-family: var(--font-mono);
          font-weight: 500;
          font-size: 0.875rem;
          color: var(--accent-cyan);
        }
        .pht__weight-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: flex-end;
        }
        .pht__weight-bar {
          height: 4px;
          background: var(--accent-blue);
          border-radius: 2px;
          max-width: 48px;
          min-width: 2px;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};