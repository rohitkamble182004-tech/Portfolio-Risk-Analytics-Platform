// frontend/types/risk.ts

export interface RiskRequest {
  tickers: string[];
  weights: number[];
  lookback_days?: number;
  confidence_level?: number;
  time_horizon?: number;
  method?: "historical" | "parametric";  // Monte Carlo is not supported here
  portfolio_value: number;
}

export interface VaRResult {
  varPct: number;
  varDollar: number;
  confidenceLevel: number;
  timeHorizon: number;
  method: string;
}

export interface CVaRResult {
  cvarPct: number;
  cvarDollar: number;
  confidenceLevel: number;
  timeHorizon: number;
}

export interface RiskMetrics {
  var: VaRResult;
  cvar: CVaRResult;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  maxDrawdown: number | null;
  annualizedReturn: number | null;
  annualizedVolatility: number | null;
  correlationMatrix: number[][] | null;
  tickers: string[];
}

export interface RiskBreakdown {
  portfolioId: string;
  confidence_level: number;
  time_horizon: number;
  total_var: number;
  breakdown: Array<{
    ticker: string;
    component_var: number;
    percent_contribution: number;
    marginal_var: number;
  }>;
}