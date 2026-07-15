// frontend/types/simulation.ts
// Backend API Contract - DO NOT MODIFY without updating backend

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

export interface SimulationRequest {
  tickers: string[];
  weights: number[];
  portfolio_value: number;
  num_simulations: number;
  time_horizon: number;
  confidence_level: number;
  random_seed?: number;
}

export interface SimulationDefaults {
  num_simulations: number;
  max_simulations: number;
  time_horizon: number;
  confidence_level: number;
}