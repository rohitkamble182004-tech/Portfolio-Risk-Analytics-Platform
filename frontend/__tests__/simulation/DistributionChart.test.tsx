import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DistributionChart } from "../../components/simulation/DistributionChart";
import type { SimulationResults } from "../../types/simulation";

// Mock Recharts
jest.mock("recharts", () => {
  const React = require("react");
  return {
    AreaChart:         ({ children }: any) => <div data-testid="area-chart">{children}</div>,
    BarChart:          ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Area:              () => <div />,
    Bar:               ({ children }: any) => <div>{children}</div>,
    Cell:              () => <div />,
    XAxis:             () => <div />,
    YAxis:             () => <div />,
    CartesianGrid:     () => <div />,
    Tooltip:           () => <div />,
    ReferenceLine:     () => <div />,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

const mockResults: SimulationResults = {
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
    { percentile: 5,  values: [125000, 95000],  finalValue: 95000  },
    { percentile: 25, values: [125000, 118000], finalValue: 118000 },
    { percentile: 50, values: [125000, 139000], finalValue: 139000 },
    { percentile: 75, values: [125000, 162000], finalValue: 162000 },
    { percentile: 95, values: [125000, 210000], finalValue: 210000 },
  ],
  distribution: {
    bins: [62000, 80000, 98000, 116000, 134000, 152000, 170000],
    frequencies: [50, 200, 800, 1500, 1200, 700, 350],
    mean: 141250,
    median: 139000,
    stdDev: 22000,
    skewness: 0.42,
    kurtosis: 3.1,
    min: 62000,
    max: 310000,
  },
};

describe("DistributionChart", () => {
  it("renders the chart title", () => {
    render(<DistributionChart results={mockResults} />);
    expect(screen.getByText("Return Distribution")).toBeInTheDocument();
  });

  it("renders mode toggle buttons", () => {
    render(<DistributionChart results={mockResults} />);
    expect(screen.getByText("Fan")).toBeInTheDocument();
    expect(screen.getByText("Histogram")).toBeInTheDocument();
  });

  it("shows area chart by default (Fan mode)", () => {
    render(<DistributionChart results={mockResults} />);
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
  });

  it("switches to histogram mode", () => {
    render(<DistributionChart results={mockResults} />);
    fireEvent.click(screen.getByText("Histogram"));
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("area-chart")).not.toBeInTheDocument();
  });

  it("switches back to fan mode", () => {
    render(<DistributionChart results={mockResults} />);
    fireEvent.click(screen.getByText("Histogram"));
    fireEvent.click(screen.getByText("Fan"));
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
  });

  it("renders distribution stat labels", () => {
    render(<DistributionChart results={mockResults} />);
    expect(screen.getByText("Mean Return")).toBeInTheDocument();
    expect(screen.getByText("Median")).toBeInTheDocument();
    expect(screen.getByText("Std Dev")).toBeInTheDocument();
    expect(screen.getByText("Skewness")).toBeInTheDocument();
    expect(screen.getByText("Kurtosis")).toBeInTheDocument();
  });

  it("renders skewness value", () => {
    render(<DistributionChart results={mockResults} />);
    expect(screen.getByText("0.420")).toBeInTheDocument();
  });

  it("renders kurtosis value", () => {
    render(<DistributionChart results={mockResults} />);
    expect(screen.getByText("3.100")).toBeInTheDocument();
  });
});