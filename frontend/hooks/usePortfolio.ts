// frontend/hooks/usePortfolio.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { portfolioApi } from "../services/portfolioApi";
import type {
  Portfolio,
  PortfolioSummary,
  CreatePortfolioRequest,
  AddHoldingRequest,
} from "../types/portfolio";
import type { ApiError } from "../services/apiClient";
import { 
  normalizePortfolio, 
  normalizePortfolioList,
  NormalizedPortfolio,
  logRawResponse,
  safeNumber,
  safeString
} from "../utils/dataAdapter";

/* ─── usePortfolioList ──────────────────────────────────────────────────── */
export function usePortfolioList() {
  const [portfolios, setPortfolios] = useState<NormalizedPortfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await portfolioApi.list();
      logRawResponse("/portfolios", data);
      
      // If we have portfolios, fetch full details for each to get market values
      if (Array.isArray(data) && data.length > 0) {
        const fullPortfolios = await Promise.all(
          data.map(async (summary: PortfolioSummary) => {
            try {
              const full = await portfolioApi.get(summary.id);
              return normalizePortfolio(full);
            } catch (err) {
              console.warn(`Failed to fetch full details for ${summary.id}:`, err);
              // Fallback: use summary data
              return {
                id: safeString(summary.id),
                name: safeString(summary.name),
                description: summary.description || null,
                currency: safeString(summary.currency || "USD"),
                benchmark: null, // Summary doesn't have benchmark
                holdings: [],
                totalValue: safeNumber(summary.totalValue),
                totalCost: safeNumber(summary.totalCost),
                totalGainLoss: safeNumber(summary.totalGainLoss),
                totalGainLossPct: safeNumber(summary.totalGainLossPct),
                holdingCount: safeNumber(summary.holdingsCount),
                createdAt: safeString(summary.createdAt),
                updatedAt: safeString(summary.updatedAt),
              };
            }
          })
        );
        setPortfolios(fullPortfolios);
      } else {
        setPortfolios([]);
      }
    } catch (err: any) {
      setError((err as ApiError).message ?? "Failed to load portfolios.");
      setPortfolios([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { portfolios, isLoading, error, refresh: fetch };
}

/* ─── usePortfolio ──────────────────────────────────────────────────────── */
export function usePortfolio(portfolioId: string | null) {
  const [portfolio, setPortfolio] = useState<NormalizedPortfolio | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!portfolioId) { 
      setPortfolio(null); 
      setIsLoading(false);
      return; 
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await portfolioApi.get(portfolioId);
      logRawResponse(`/portfolios/${portfolioId}`, data);
      const normalized = normalizePortfolio(data);
      setPortfolio(normalized);
    } catch (err: any) {
      setError((err as ApiError).message ?? "Failed to load portfolio.");
      setPortfolio(null);
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { portfolio, isLoading, error, refresh: fetch };
}

/* ─── usePortfolioMutations ─────────────────────────────────────────────── */
export function usePortfolioMutations() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const wrap = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setIsSubmitting(true);
    setMutationError(null);
    try {
      const result = await fn();
      return result;
    } catch (err: any) {
      if (mountedRef.current) {
        setMutationError((err as ApiError).message ?? "Operation failed.");
      }
      return null;
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    mutationError,

    createPortfolio: (payload: CreatePortfolioRequest) =>
      wrap(() => portfolioApi.create(payload)),

    updatePortfolio: (
      id: string,
      payload: Partial<Pick<Portfolio, "name" | "description" | "benchmark" | "currency">>,
    ) => wrap(() => portfolioApi.update(id, payload)),

    deletePortfolio: (id: string) =>
      wrap(() => portfolioApi.delete(id)),

    addHolding: (portfolioId: string, payload: AddHoldingRequest) =>
      wrap(() => portfolioApi.addHolding(portfolioId, payload)),

    removeHolding: (portfolioId: string, holdingId: string) =>
      wrap(() => portfolioApi.removeHolding(portfolioId, holdingId)),

    refreshPrices: (portfolioId: string) =>
      wrap(() => portfolioApi.refreshPrices(portfolioId)),
  };
}

// Export the normalized types for use in components
export type { NormalizedPortfolio };