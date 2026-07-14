// frontend/hooks/useSimulation.ts

import { useState, useCallback, useRef } from "react";
import { simulationApi, SimulationResult, RunSimulationRequest } from "../services/simulationApi";

interface Position {
  symbol: string;
  weight: number;
  marketValue?: number;
}

export function useSimulation(portfolioId: string | null) {
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const runSimulation = useCallback(
    async (
      params: {
        numSimulations: number;
        horizonDays: number;
        confidenceLevel: number;
      },
      positions: Position[],
      portfolioValue?: number,
    ) => {
      if (!portfolioId) {
        setError("No portfolio selected");
        return;
      }

      if (!positions.length) {
        setError("No valid positions found");
        return;
      }

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsRunning(true);
      setError(null);
      setResults(null);

      try {
        // Calculate portfolio value - use provided value or estimate from weights
        let calculatedValue = portfolioValue || 100000;
        
        // If we have positions with weights, use them to calculate
        if (positions.length > 0) {
          const totalWeight = positions.reduce((sum, p) => sum + p.weight, 0);
          if (totalWeight > 0) {
            // Use the portfolio value provided
            calculatedValue = portfolioValue || 100000;
          }
        }

        const request: RunSimulationRequest = {
          tickers: positions.map((p) => p.symbol),
          weights: positions.map((p) => p.weight),
          portfolio_value: calculatedValue,
          num_simulations: params.numSimulations,
          time_horizon: params.horizonDays,
          confidence_level: params.confidenceLevel,
        };

        console.log("🔍 Simulation Request:", JSON.stringify(request, null, 2));

        const result = await simulationApi.run(request);
        
        console.log("✅ Simulation Result:", JSON.stringify(result, null, 2));
        console.log("📊 finalValues:", result.finalValues);
        console.log("📈 pathsSample length:", result.pathsSample?.length);
        
        setResults(result);
      } catch (err: any) {
        console.error("❌ Simulation Error:", err);
        if (err.name === "AbortError") {
          setError("Simulation cancelled");
        } else {
          setError(err.message || "Simulation failed");
        }
        setResults(null);
      } finally {
        setIsRunning(false);
        abortControllerRef.current = null;
      }
    },
    [portfolioId],
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setResults(null);
    setError(null);
    setIsRunning(false);
  }, []);

  return {
    results,
    isRunning,
    error,
    runSimulation,
    reset,
  };
}