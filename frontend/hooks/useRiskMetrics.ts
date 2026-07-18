// frontend/hooks/useRiskMetrics.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { riskApi } from "../services/riskApi";
import type { RiskMetrics } from "../types/risk";
import type { ApiError } from "../services/apiClient";
import { safeNumber, logRawResponse } from "../utils/dataAdapter";

interface Position {
  symbol: string;
  marketValue: number;
}

export function useRiskMetrics(portfolioId: string | null, positions: Position[]) {
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchCountRef = useRef(0);
  const lastFetchRef = useRef<string>("");

  const fetch = useCallback(async () => {
    // Prevent duplicate fetches with same data
    const fetchKey = `${portfolioId}-${positions.length}`;
    if (fetchKey === lastFetchRef.current && fetchCountRef.current > 0) {
      return;
    }
    lastFetchRef.current = fetchKey;
    fetchCountRef.current += 1;

    // Reset states
    setMetrics(null);
    setError(null);

    // Validate inputs
    if (!portfolioId) {
      setIsLoading(false);
      return;
    }

    // Validate positions
    if (!Array.isArray(positions) || positions.length === 0) {
  setMetrics(null);
  setError(null);
  setIsLoading(false);
  return;
}

    // Filter out positions with invalid market values
    const validPositions = positions.filter(
      (p) => 
        p && 
        typeof p === 'object' &&
        p.symbol && 
        typeof p.symbol === 'string' &&
        p.symbol.trim().length > 0 &&
        Number.isFinite(p.marketValue) &&
        p.marketValue > 0
    );

    if (validPositions.length === 0) {
  setMetrics(null);
  setError(null);
  setIsLoading(false);
  return;
}

    // Aggregate positions by ticker to handle duplicates
    const aggregatedPositions = new Map<string, { symbol: string; marketValue: number }>();
    
    validPositions.forEach((p) => {
      const symbol = p.symbol.trim().toUpperCase();
      const existing = aggregatedPositions.get(symbol);
      if (existing) {
        existing.marketValue += safeNumber(p.marketValue);
      } else {
        aggregatedPositions.set(symbol, {
          symbol: symbol,
          marketValue: safeNumber(p.marketValue),
        });
      }
    });

    const uniquePositions = Array.from(aggregatedPositions.values());

    // Calculate total market value
    const totalValue = uniquePositions.reduce(
      (sum, p) => sum + safeNumber(p.marketValue),
      0
    );

    if (totalValue <= 0) {
    setMetrics(null);
    setError(null);
    setIsLoading(false);
    return;
}

    // Extract tickers and weights
    const tickers = uniquePositions.map((p) => p.symbol);
    const weights = uniquePositions.map((p) => safeNumber(p.marketValue) / totalValue);

    setIsLoading(true);

    try {
      // Fetch risk metrics - use "historical" method
      const metricsResult = await riskApi.getMetrics({
        portfolioId,
        tickers,
        weights,
        lookback_days: 252,
        confidence_level: 0.95,
        time_horizon: 1,
        method: "historical",
        portfolio_value: totalValue,
      });

      logRawResponse("/risk/metrics", metricsResult);
      setMetrics(metricsResult);
      setError(null);
    } catch (err: any) {
      console.error("❌ Risk metrics error:", err);
      
      // Handle specific error cases
      if (err?.detail?.includes("No valid weights")) {
        setError("Invalid portfolio weights. Please check your holdings.");
      } else if (err?.status === 422) {
        setError(err?.detail || "Invalid request parameters for risk analysis");
      } else {
        setError((err as ApiError).message ?? "Failed to load risk metrics.");
      }
      
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, positions]);

  useEffect(() => {
    // Debounce fetch to avoid rapid re-renders
    const timer = setTimeout(() => {
      fetch();
    }, 500);

    return () => clearTimeout(timer);
  }, [fetch]);

  return { metrics, isLoading, error, refresh: fetch };
}