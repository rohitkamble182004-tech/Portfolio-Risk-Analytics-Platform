import React from "react";
import { render, screen } from "@testing-library/react";
import { SimulationResultsData } from "../../components/simulation/SimulationResults";
import type { SimulationResults as SimResults } from "../../types/simulation";

const mockResults: SimResults = {
  simulationId: "sim1",
  portfolioId: "p1",
  params: {
    portfolioId: "p1",
    numSimulations: 5000,
    horizonDays: 252,
    confidenceLevel: 0.95,
    method: "geometric_brownian",
  },
  completedAt: "2024-06-01T12:05:00Z",
  durationMs: 3200,
  initialValue: 125000,
  meanFinalValue: 141250,
  medianFinalValue: 139000,
  stdDevFinalValue: 22000,
  minFinalValue: 62000,
  maxFinalValue: 310000,
  probabilityOfLoss: 0.18,
  probabilityOfDoublingPortfolio: 0.07,
  expectedShortfall: 21500,
  simulationVaR: 18750,
  simulationVaRPct: 0.15,
  percentiles: [
    { percentile: 5,  values: [125000, 110000, 95000],  finalValue: 95000  },
    { percentile: 25, values: [125000, 128000, 118000], finalValue: 118000 },
    { percentile: 50, values: [125000, 132000, 139000], finalValue: 139000 },
    { percentile: 75, values: [125000, 138000, 162000], finalValue: 162000 },
    { percentile: 95, values: [125000, 155000, 210000], finalValue: 210000 },
  ],
  distribution: {
    bins: [62000, 80000, 98000, 116000, 134000, 152000, 170000, 188000, 206000],
    frequencies: [50, 200, 800, 1500, 1200, 700, 350, 150, 50],
    mean: 141250,
    median: 139000,
    stdDev: 22000,
    skewness: 0.42,
    kurtosis: 3.1,
    min: 62000,
    max: 310000,
  },
};

describe("SimulationResults", () => {
  it("renders the section title", () => {
    render(<SimulationResultsData results={mockResults} />);
    expect(screen.getByText("Simulation Results")).toBeInTheDocument();
  });

  it("renders initial value", () => {
    render(<SimulationResultsData results={mockResults} />);
    expect(screen.getByText("$125,000")).toBeInTheDocument();
  });

  it("renders mean final value", () => {
    render(<SimulationResultsData results={mockResults} />);
    expect(screen.getByText("$141,250")).toBeInTheDocument();
  });

  it("renders probability of loss", () => {
    render(<SimulationResultsData results={mockResults} />);
    expect(screen.getByText("18.0%")).toBeInTheDocument();
  });

  it("renders probability of doubling", () => {
    render(<SimulationResultsData results={mockResults} />);
    expect(screen.getByText("7.0%")).toBeInTheDocument();
  });

  it("renders simulation VaR", () => {
    render(<SimulationResultsData results={mockResults} />);
    expect(screen.getByText("$18,750")).toBeInTheDocument();
  });

  it("renders expected shortfall", () => {
    render(<SimulationResultsData results={mockResults} />);
    expect(screen.getByText("$21,500")).toBeInTheDocument();
  });

  it("renders all percentile rows", () => {
    render(<SimulationResultsData results={mockResults} />);
    ["P5", "P25", "P50", "P75", "P95"].forEach((p) => {
      expect(screen.getByText(p)).toBeInTheDocument();
    });
  });

  it("renders method badge", () => {
    render(<SimulationResultsData results={mockResults} />);
    expect(screen.getByText("geometric brownian")).toBeInTheDocument();
  });

  it("renders number of simulations", () => {
    render(<SimulationResultsData results={mockResults} />);
    expect(screen.getByText("5,000")).toBeInTheDocument();
  });

  it("renders min and max final values", () => {
    render(<SimulationResultsData results={mockResults} />);
    expect(screen.getByText("$62,000")).toBeInTheDocument();
    expect(screen.getByText("$310,000")).toBeInTheDocument();
  });

  it("renders duration", () => {
    render(<SimulationResultsData results={mockResults} />);
    expect(screen.getByText(/3.2s/)).toBeInTheDocument();
  });
});