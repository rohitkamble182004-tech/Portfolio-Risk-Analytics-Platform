// frontend/services/riskApi.ts

import { apiClient } from "./apiClient";
import type { RiskMetrics, RiskRequest } from "../types/risk";

export const riskApi = {
  /**
   * Get risk metrics for a portfolio
   * Supports: "historical" (default) or "parametric"
   */
  getMetrics(params: {
    portfolioId: string;
    tickers: string[];
    weights: number[];
    lookback_days?: number;
    confidence_level?: number;
    time_horizon?: number;
    method?: "historical" | "parametric";
    portfolio_value?: number;
  }): Promise<RiskMetrics> {
    // Validate inputs
    if (!Array.isArray(params.tickers) || params.tickers.length === 0) {
      throw new Error("No tickers provided");
    }

    // Filter and validate weights
    const validWeights = params.weights.filter(w => Number.isFinite(w) && w > 0);
    if (validWeights.length === 0) {
      throw new Error("No valid weights provided");
    }

    // Ensure weights sum to 1
    const weightSum = validWeights.reduce((s, w) => s + w, 0);
    const normalizedWeights = weightSum > 0 
      ? validWeights.map(w => w / weightSum)
      : validWeights;

    // Filter tickers to match valid weights
    const validTickers = params.tickers.filter((t, i) => 
      t && 
      t.trim().length > 0 && 
      Number.isFinite(params.weights[i]) && 
      params.weights[i] > 0
    );

    if (validTickers.length === 0) {
      throw new Error("No valid tickers with positive weights");
    }

    const request: RiskRequest = {
      tickers: validTickers.map(t => t.trim().toUpperCase()),
      weights: normalizedWeights.slice(0, validTickers.length),
      lookback_days: params.lookback_days ?? 252,
      confidence_level: params.confidence_level ?? 0.95,
      time_horizon: params.time_horizon ?? 1,
      method: params.method ?? "historical",
      portfolio_value: params.portfolio_value ?? 100000,
    };

    console.log("📤 Risk API Request:", JSON.stringify(request, null, 2));

    return apiClient.post<RiskMetrics>("/risk/metrics", request);
  },

  /**
   * Get available risk calculation methods
   */
  getMethods(): Promise<{ methods: { id: string; description: string }[] }> {
    return apiClient.get("/risk/methods");
  },
};