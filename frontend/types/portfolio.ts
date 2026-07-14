/* ─── Enums ──────────────────────────────────────────────────────────────── */
export type AssetClass =
  | "equity"
  | "bond"
  | "commodity"
  | "cash"
  | "crypto"
  | "alternative"
  | "real_estate";

export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "INR" | "CHF" | "CAD" | "AUD";

/* ─── Holding ────────────────────────────────────────────────────────────── */
export interface Holding {
  id: string;
  ticker: string;
  name: string;
  asset_Class: AssetClass;
  quantity: number;
  avg_Cost: number;           // USD per unit
  currentPrice: number;      // USD per unit (refreshed)
  marketValue: number;       // quantity × currentPrice
  weight: number;            // fraction of portfolio, 0–1
  gainLoss: number;          // marketValue − (quantity × avgCost)
  gainLossPct: number;       // gainLoss / (quantity × avgCost)
  sector?: string;
  country?: string;
  exchange?: string;
  isin?: string;
  currency?: Currency;
  priceUpdatedAt?: string;   // ISO date of last price fetch
  notes?: string;
}

/* ─── Portfolio ──────────────────────────────────────────────────────────── */
export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  currency: Currency;
  benchmark?: string;        // e.g. "SPY"
  holdings: Holding[];
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  createdAt: string;
  updatedAt: string;
  owner?: string;
  tags?: string[];
}

/* ─── Summary (list view) ────────────────────────────────────────────────── */
export interface PortfolioSummary {
  id: string;
  name: string;
  description?: string;
  currency: Currency;
  holdingsCount: number;
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  updatedAt: string;
  createdAt: string;
}

/* ─── Request payloads ───────────────────────────────────────────────────── */
export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  currency?: Currency;
  benchmark?: string;
  tags?: string[];
}

export interface AddHoldingRequest {
  ticker: string;
  quantity: number;
  avgCost: number;
  assetClass: AssetClass;
  name?: string;
  sector?: string;
  country?: string;
  exchange?: string;
  isin?: string;
  currency?: Currency;
  notes?: string;
}

/* ─── Allocation helpers ─────────────────────────────────────────────────── */
export interface SectorAllocation {
  sector: string;
  weight: number;
  marketValue: number;
}

export interface AssetClassAllocation {
  assetClass: AssetClass;
  weight: number;
  marketValue: number;
}

export interface CountryAllocation {
  country: string;
  weight: number;
  marketValue: number;
}