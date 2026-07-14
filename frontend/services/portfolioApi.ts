import { apiClient } from "./apiClient";
import type {
  Portfolio,
  PortfolioSummary,
  CreatePortfolioRequest,
  AddHoldingRequest,
  Holding,
} from "../types/portfolio";

/* ─── Endpoint constants ─────────────────────────────────────────────────── */
const BASE = "/portfolios";

/* ─── Portfolio API ──────────────────────────────────────────────────────── */
export const portfolioApi = {
  /**
   * List all portfolios (summary level — no full holdings).
   */
  list(): Promise<PortfolioSummary[]> {
    return apiClient.get<PortfolioSummary[]>(BASE);
  },

  /**
   * Get a single portfolio with all holdings and computed values.
   */
  get(portfolioId: string): Promise<Portfolio> {
    return apiClient.get<Portfolio>(`${BASE}/${portfolioId}`);
  },

  /**
   * Create a new empty portfolio.
   */
  create(payload: CreatePortfolioRequest): Promise<Portfolio> {
    return apiClient.post<Portfolio>(BASE, payload);
  },

  /**
   * Update portfolio metadata (name, description, benchmark, currency).
   */
  update(
    portfolioId: string,
    payload: Partial<Pick<Portfolio, "name" | "description" | "benchmark" | "currency">>,
  ): Promise<Portfolio> {
    return apiClient.patch<Portfolio>(`${BASE}/${portfolioId}`, payload);
  },

  /**
   * Delete a portfolio and all its holdings.
   */
  delete(portfolioId: string): Promise<void> {
    return apiClient.delete(`${BASE}/${portfolioId}`);
  },

  /**
   * Add a holding to an existing portfolio.
   */
  addHolding(portfolioId: string, payload: AddHoldingRequest): Promise<Portfolio> {
    return apiClient.post<Portfolio>(`${BASE}/${portfolioId}/holdings`, payload);
  },

  /**
   * Update an existing holding (quantity, avg cost, etc.).
   */
  updateHolding(
    portfolioId: string,
    holdingId: string,
    payload: Partial<Pick<Holding, "quantity" | "avg_Cost" | "asset_Class">>,
  ): Promise<Portfolio> {
    return apiClient.patch<Portfolio>(
      `${BASE}/${portfolioId}/holdings/${holdingId}`,
      payload,
    );
  },

  /**
   * Remove a single holding from a portfolio.
   */
  removeHolding(portfolioId: string, holdingId: string): Promise<Portfolio> {
    return apiClient.delete<Portfolio>(
      `${BASE}/${portfolioId}/holdings/${holdingId}`,
    );
  },

  /**
   * Trigger a market-data refresh for all holdings in a portfolio.
   * Returns the updated portfolio with fresh currentPrice values.
   */
  refreshPrices(portfolioId: string): Promise<Portfolio> {
    return apiClient.post<Portfolio>(`${BASE}/${portfolioId}/refresh-prices`);
  },

  /**
   * Get a snapshot of historical performance data for charting.
   * Returns daily NAV timeseries.
   */
  getPerformance(
    portfolioId: string,
    params?: { startDate?: string; endDate?: string; benchmark?: string },
  ): Promise<{ date: string; nav: number; benchmark?: number }[]> {
    return apiClient.get(`${BASE}/${portfolioId}/performance`, params as any);
  },

  /**
   * Export portfolio as CSV.
   */
  exportCsv(portfolioId: string): Promise<Blob> {
    return apiClient.instance
      .get(`${BASE}/${portfolioId}/export`, {
        responseType: "blob",
        headers: { Accept: "text/csv" },
      })
      .then((r) => r.data);
  },
};