// frontend/api/simulationApi.ts

import { apiClient } from "../services/apiClient";

/* ─── Request / Response shapes ─────────────────────────────────────────── */
export interface RunSimulationRequest {
  tickers: string[];
  weights: number[];
  portfolio_value: number;
  num_simulations: number;
  time_horizon: number;
  confidence_level: number;
  random_seed?: number;
}

// Backend returns camelCase for responses
export interface PercentileResult {
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

export interface SimulationResult {
  numSimulations: number;
  timeHorizon: number;
  initialValue: number;
  finalValues: PercentileResult;
  varDollar: number;
  cvarDollar: number;
  probabilityOfLoss: number;
  expectedFinalValue: number;
  pathsSample: number[][] | null;
}

export interface DefaultParams {
  num_simulations: number;
  max_simulations: number;
  time_horizon: number;
  confidence_level: number;
}

/* ─── Simulation API ─────────────────────────────────────────────────────── */
export const simulationApi = {
  /**
   * Run a Monte Carlo simulation synchronously.
   * Returns results directly (no async job/polling).
   */
  run(req: RunSimulationRequest): Promise<SimulationResult> {
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
  getDefaults(): Promise<DefaultParams> {
    return apiClient.get<DefaultParams>("/simulation/defaults");
  },
};