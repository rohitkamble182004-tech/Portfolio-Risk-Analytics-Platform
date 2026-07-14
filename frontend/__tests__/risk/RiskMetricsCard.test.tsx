import React from "react";
import { render, screen } from "@testing-library/react";
import { RiskMetricsCard } from "../../components/risk/RiskMetricsCard";
import type { RiskMetrics } from "../../types/risk";

const mockMetrics: RiskMetrics = {
  portfolioId: "p1",
  calculatedAt: "2024-06-01T12:00:00Z",
  var: [],
  cvar: [],
  sharpeRatio: 1.8,
  sortinoRatio: 2.1,
  beta: 0.95,
  alpha: 0.03,
  maxDrawdown: -12000,
  maxDrawdownPct: -0.096,
  volatilityAnnualized: 0.14,
  trackingError: 0.05,
  informationRatio: 0.6,
};

describe("RiskMetricsCard", () => {
  it("renders all metric labels", () => {
    render(<RiskMetricsCard metrics={mockMetrics} />);
    expect(screen.getByText("Sharpe Ratio")).toBeInTheDocument();
    expect(screen.getByText("Sortino Ratio")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText(/Alpha/)).toBeInTheDocument();
    expect(screen.getByText(/Volatility/)).toBeInTheDocument();
    expect(screen.getByText(/Max Drawdown/)).toBeInTheDocument();
    expect(screen.getByText(/Tracking Error/)).toBeInTheDocument();
    expect(screen.getByText(/Info\. Ratio/)).toBeInTheDocument();
  });

  it("renders sharpe ratio value", () => {
    render(<RiskMetricsCard metrics={mockMetrics} />);
    expect(screen.getByText("1.80")).toBeInTheDocument();
  });

  it("renders sortino ratio value", () => {
    render(<RiskMetricsCard metrics={mockMetrics} />);
    expect(screen.getByText("2.10")).toBeInTheDocument();
  });

  it("renders volatility as percentage", () => {
    render(<RiskMetricsCard metrics={mockMetrics} />);
    expect(screen.getByText("14.00%")).toBeInTheDocument();
  });

  it("renders max drawdown as percentage", () => {
    render(<RiskMetricsCard metrics={mockMetrics} />);
    expect(screen.getByText("-9.60%")).toBeInTheDocument();
  });

  it("shows skeleton when isLoading is true", () => {
    render(<RiskMetricsCard metrics={mockMetrics} isLoading />);
    expect(screen.queryByText("Sharpe Ratio")).not.toBeInTheDocument();
  });

  it("renders calculated timestamp", () => {
    render(<RiskMetricsCard metrics={mockMetrics} />);
    expect(screen.getByText(/As of/)).toBeInTheDocument();
  });

  it("renders beta value", () => {
    render(<RiskMetricsCard metrics={mockMetrics} />);
    expect(screen.getByText("0.95")).toBeInTheDocument();
  });

  it("renders information ratio value", () => {
    render(<RiskMetricsCard metrics={mockMetrics} />);
    expect(screen.getByText("0.60")).toBeInTheDocument();
  });
});