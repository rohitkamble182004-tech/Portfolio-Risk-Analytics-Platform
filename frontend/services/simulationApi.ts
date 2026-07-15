// frontend/api/simulationApi.ts

import { apiClient } from "../services/apiClient";
import type {
  SimulationResult,
  SimulationRequest,
  SimulationDefaults,
} from "../types/simulation";

/* ─── Request / Response shapes ─────────────────────────────────────────── */
// Re-export for convenience
export type { SimulationResult, SimulationRequest, SimulationDefaults };

/* ─── Simulation API ─────────────────────────────────────────────────────── */
export const simulationApi = {
  /**
   * Run a Monte Carlo simulation synchronously.
   * Returns results directly (no async job/polling).
   */
  run(req: SimulationRequest): Promise<SimulationResult> {
    return apiClient.post<SimulationResult>("/simulation/run", {
      tickers: req.tickers,
      weights: req.weights,
      portfolio_value: req.portfolio_value,
      num_simulations: req.num_simulations,
      time_horizon: req.time_horizon,
      confidence_level: req.confidence_level,
      random_seed: req.random_seed,
    });
  },

  /**
   * Get server-side default simulation parameters.
   */
  getDefaults(): Promise<SimulationDefaults> {
    return apiClient.get<SimulationDefaults>("/simulation/defaults");
  },
};