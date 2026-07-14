import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RiskBreakdownChart } from "../../components/risk/RiskBreakdownChart";
import type { RiskBreakdownResponse } from "../../types/risk";

// Mock Recharts to avoid SVG rendering issues in jsdom
jest.mock("recharts", () => {
  const React = require("react");
  return {
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Bar: ({ children }: any) => <div data-testid="bar">{children}</div>,
    Cell: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

const mockBreakdown: RiskBreakdownResponse = {
  portfolioId: "p1",
  calculatedAt: "2024-06-01T12:00:00Z",
  totalVaR: 3200,
  breakdown: [
    { ticker: "AAPL", name: "Apple Inc.",      marginalVaR: 0.025, componentVaR: 1440, percentContribution: 0.45, beta: 1.2, specificRisk: 0.08, systematicRisk: 0.12 },
    { ticker: "MSFT", name: "Microsoft Corp.", marginalVaR: 0.018, componentVaR: 960,  percentContribution: 0.30, beta: 0.9, specificRisk: 0.06, systematicRisk: 0.09 },
    { ticker: "GLD",  name: "SPDR Gold",       marginalVaR: 0.012, componentVaR: 800,  percentContribution: 0.25, beta: 0.1, specificRisk: 0.14, systematicRisk: 0.02 },
  ],
};

describe("RiskBreakdownChart", () => {
  it("renders the chart title", () => {
    render(<RiskBreakdownChart breakdown={mockBreakdown} />);
    expect(screen.getByText("Risk Contribution Breakdown")).toBeInTheDocument();
  });

  it("renders view toggle buttons", () => {
    render(<RiskBreakdownChart breakdown={mockBreakdown} />);
    expect(screen.getByText("Contribution")).toBeInTheDocument();
    expect(screen.getByText("Marginal")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders total VaR in footer", () => {
    render(<RiskBreakdownChart breakdown={mockBreakdown} />);
    expect(screen.getByText(/Total Portfolio VaR/)).toBeInTheDocument();
    expect(screen.getByText(/3,200/)).toBeInTheDocument();
  });

  it("renders the bar chart container", () => {
    render(<RiskBreakdownChart breakdown={mockBreakdown} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("shows spinner when isLoading", () => {
    const { container } = render(<RiskBreakdownChart breakdown={mockBreakdown} isLoading />);
    expect(container.querySelector(".spinner")).toBeInTheDocument();
  });

  it("switches view mode on button click", () => {
    render(<RiskBreakdownChart breakdown={mockBreakdown} />);
    const marginalBtn = screen.getByText("Marginal");
    fireEvent.click(marginalBtn);
    expect(marginalBtn.classList.contains("vcd__toggle--active")).toBe(true);
  });
});