// frontend/utils/dataAdapter.ts

/**
 * Data adapter to normalize backend responses
 * into frontend models with proper null safety
 */

export interface NormalizedHolding {
  id: string;
  ticker: string;
  quantity: number;
  avgCost: number;
  assetClass: string;
  currentPrice: number | null;
  marketValue: number | null;
  weight: number;
  gainLoss: number;
  gainLossPct: number;
}

export interface NormalizedPortfolio {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  benchmark: string | null;
  holdings: NormalizedHolding[];
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  holdingCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Safe number parser - returns 0 for any invalid value
 */
export function safeNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Safe string parser - returns "—" for invalid values
 */
export function safeString(value: any): string {
  if (value === null || value === undefined) return "—";
  const str = String(value);
  return str.trim() || "—";
}

/**
 * Safe date formatter - returns "—" for invalid dates
 */
export function safeDate(value: any): string {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  } catch {
    return "—";
  }
}

/**
 * Safe currency formatter
 */
export function safeCurrency(value: any, currency = "USD"): string {
  const num = safeNumber(value);
  if (num === 0) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return "—";
  }
}

/**
 * Safe percentage formatter
 */
export function safePercent(value: any): string {
  const num = safeNumber(value);
  if (num === 0) return "—";
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}

/**
 * Normalize a single holding from backend to frontend model
 */
export function normalizeHolding(holding: any): NormalizedHolding {
  return {
    id: safeString(holding.id),
    ticker: safeString(holding.ticker),
    quantity: safeNumber(holding.quantity),
    avgCost: safeNumber(holding.avgCost),
    assetClass: safeString(holding.assetClass),
    currentPrice: safeNumber(holding.currentPrice) || null,
    marketValue: safeNumber(holding.marketValue) || null,
    weight: safeNumber(holding.weight),
    gainLoss: safeNumber(holding.gainLoss),
    gainLossPct: safeNumber(holding.gainLossPct),
  };
}

/**
 * Normalize a portfolio from backend to frontend model
 */
export function normalizePortfolio(portfolio: any): NormalizedPortfolio {
  const holdings = Array.isArray(portfolio.holdings) 
    ? portfolio.holdings.map(normalizeHolding)
    : [];

  // Calculate totals from holdings if available
  let totalMarketValue = 0;
  let totalCost = 0;
  let totalGainLoss = 0;
  
  if (holdings.length > 0) {
    holdings.forEach((h: NormalizedHolding) => {
      const marketVal = safeNumber(h.marketValue);
      const cost = safeNumber(h.quantity) * safeNumber(h.avgCost);
      totalMarketValue += marketVal;
      totalCost += cost;
      totalGainLoss += marketVal - cost;
    });
  }

  // Use calculated values if available, otherwise fall back to API response
  const marketValueFromApi = safeNumber(portfolio.marketValue);
  const costFromApi = safeNumber(portfolio.value);
  
  // Prefer calculated values from holdings, then API marketValue, then API value
  const finalMarketValue = totalMarketValue > 0 ? totalMarketValue : marketValueFromApi;
  const finalCost = totalCost > 0 ? totalCost : costFromApi;
  const finalGainLoss = totalGainLoss !== 0 ? totalGainLoss : safeNumber(portfolio.pnl);
  const finalReturnPct = safeNumber(portfolio.returnPct);

  return {
    id: safeString(portfolio.id),
    name: safeString(portfolio.name),
    description: portfolio.description || null,
    currency: safeString(portfolio.currency || "USD"),
    benchmark: portfolio.benchmark || null,
    holdings,
    totalValue: finalMarketValue || safeNumber(portfolio.marketValue),
    totalCost: finalCost,
    totalGainLoss: finalGainLoss,
    totalGainLossPct: finalReturnPct,
    holdingCount: holdings.length,
    createdAt: safeString(portfolio.createdAt),
    updatedAt: safeString(portfolio.updatedAt),
  };
}

/**
 * Normalize a list of portfolios from summary data
 */
export function normalizePortfolioList(portfolios: any[]): NormalizedPortfolio[] {
  if (!Array.isArray(portfolios)) return [];
  
  return portfolios.map((p) => {
    // For summary data, we use the fields available
    return {
      id: safeString(p.id),
      name: safeString(p.name),
      description: p.description || null,
      currency: safeString(p.currency || "USD"),
      benchmark: null, // Summary doesn't include benchmark
      holdings: [],
      totalValue: safeNumber(p.totalValue || p.value),
      totalCost: safeNumber(p.totalCost || p.value),
      totalGainLoss: safeNumber(p.totalGainLoss || 0),
      totalGainLossPct: safeNumber(p.totalGainLossPct || 0),
      holdingCount: safeNumber(p.holdingsCount || p.holdingCount || 0),
      createdAt: safeString(p.createdAt),
      updatedAt: safeString(p.updatedAt),
    };
  });
}

/**
 * Log raw API response for debugging
 */
export function logRawResponse(endpoint: string, data: any): void {
  console.log(`📡 Raw ${endpoint} response:`, JSON.stringify(data, null, 2));
}