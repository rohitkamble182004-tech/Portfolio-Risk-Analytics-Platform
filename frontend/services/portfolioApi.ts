// frontend/services/portfolioApi.ts

import { apiClient } from "./apiClient";
import type {
  Portfolio,
  PortfolioSummary,
  CreatePortfolioRequest,
  AddHoldingRequest,
} from "../types/portfolio";

const BASE = "/portfolios";

/* ─── Request / Response types ──────────────────────────────────────────── */
export interface UpdatePortfolioRequest {
  name?: string;
  description?: string;
  currency?: string;
  benchmark?: string;
}

export interface HoldingUpdateRequest {
  quantity?: number;
  avgCost?: number;
  assetClass?: string;
}

/* ─── Portfolio API ──────────────────────────────────────────────────────── */
export const portfolioApi = {
  /**
   * List all portfolios (summary view)
   */
  list(): Promise<PortfolioSummary[]> {
    return apiClient.get<PortfolioSummary[]>(BASE);
  },

  /**
   * Get a single portfolio with full holdings
   */
  get(id: string): Promise<Portfolio> {
    return apiClient.get<Portfolio>(`${BASE}/${id}`);
  },

  /**
   * Create a new portfolio
   */
  create(data: CreatePortfolioRequest): Promise<Portfolio> {
    return apiClient.post<Portfolio>(BASE, data);
  },

  /**
   * Full update (PUT) – replaces metadata AND holdings
   */
  update(id: string, data: UpdatePortfolioRequest): Promise<Portfolio> {
    return apiClient.put<Portfolio>(`${BASE}/${id}`, data);
  },

  /**
   * Partial update (PATCH) – only touches fields that are present
   */
  patch(id: string, data: UpdatePortfolioRequest): Promise<Portfolio> {
    return apiClient.patch<Portfolio>(`${BASE}/${id}`, data);
  },

  /**
   * Delete a portfolio
   */
  delete(id: string): Promise<void> {
    return apiClient.delete<void>(`${BASE}/${id}`);
  },

  /**
   * Add a holding to a portfolio
   */
  addHolding(portfolioId: string, holding: AddHoldingRequest): Promise<Portfolio> {
    return apiClient.post<Portfolio>(`${BASE}/${portfolioId}/holdings`, holding);
  },

  /**
   * Update a holding
   */
  updateHolding(
    portfolioId: string,
    holdingId: string,
    data: HoldingUpdateRequest,
  ): Promise<Portfolio> {
    return apiClient.patch<Portfolio>(
      `${BASE}/${portfolioId}/holdings/${holdingId}`,
      data,
    );
  },

  /**
   * Remove a holding
   */
  removeHolding(portfolioId: string, holdingId: string): Promise<Portfolio> {
    return apiClient.delete<Portfolio>(`${BASE}/${portfolioId}/holdings/${holdingId}`);
  },

  /**
   * Refresh prices for all holdings in a portfolio
   */
  refreshPrices(portfolioId: string): Promise<Portfolio> {
    return apiClient.post<Portfolio>(`${BASE}/${portfolioId}/refresh`);
  },

  /**
   * Export portfolio as CSV.
   * Returns a Blob that can be downloaded.
   */
  exportCsv(portfolioId: string): Promise<Blob> {
    // Use the raw axios instance to handle blob response
    const instance = apiClient.getInstance();
    return instance
      .get(`${BASE}/${portfolioId}/export`, {
        responseType: "blob",
        headers: { Accept: "text/csv" },
      })
      .then((response: { data: Blob }) => response.data);
  },
};

export default portfolioApi;