import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PortfolioSummaryCard } from "../../components/portfolio/PortfolioSummaryCard";
import type { Portfolio } from "../../types/portfolio";

const mockPortfolio: Portfolio = {
  id: "p1",
  name: "Growth Portfolio",
  description: "Long-term growth focused",
  currency: "USD",
  totalValue: 125000,
  totalCost: 100000,
  totalGainLoss: 25000,
  totalGainLossPct: 25,
  holdings: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
  benchmarkTicker: "SPY",
};

describe("PortfolioSummaryCard", () => {
  it("renders portfolio name", () => {
    render(<PortfolioSummaryCard portfolio={mockPortfolio} />);
    expect(screen.getByText("Growth Portfolio")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<PortfolioSummaryCard portfolio={mockPortfolio} />);
    expect(screen.getByText("Long-term growth focused")).toBeInTheDocument();
  });

  it("displays market value correctly", () => {
    render(<PortfolioSummaryCard portfolio={mockPortfolio} />);
    expect(screen.getByText(/125,000/)).toBeInTheDocument();
  });

  it("shows positive gain in green class", () => {
    render(<PortfolioSummaryCard portfolio={mockPortfolio} />);
    const gainEl = screen.getByText(/\+\$25,000/);
    expect(gainEl).toHaveClass("pos");
  });

  it("shows negative gain with neg class", () => {
    const negPortfolio = { ...mockPortfolio, totalGainLoss: -5000, totalGainLossPct: -5 };
    render(<PortfolioSummaryCard portfolio={negPortfolio} />);
    const gainEl = screen.getByText(/-\$5,000/);
    expect(gainEl).toHaveClass("neg");
  });

  it("calls onRefreshPrices when Refresh button clicked", () => {
    const onRefresh = jest.fn();
    render(<PortfolioSummaryCard portfolio={mockPortfolio} onRefreshPrices={onRefresh} />);
    fireEvent.click(screen.getByText("Refresh"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("disables refresh button when isRefreshing", () => {
    const onRefresh = jest.fn();
    render(<PortfolioSummaryCard portfolio={mockPortfolio} onRefreshPrices={onRefresh} isRefreshing />);
    const btn = screen.getByText("Refresh").closest("button");
    expect(btn).toBeDisabled();
  });

  it("displays benchmark ticker when present", () => {
    render(<PortfolioSummaryCard portfolio={mockPortfolio} />);
    expect(screen.getByText("SPY")).toBeInTheDocument();
  });

  it("displays currency", () => {
    render(<PortfolioSummaryCard portfolio={mockPortfolio} />);
    expect(screen.getByText("USD")).toBeInTheDocument();
  });
});