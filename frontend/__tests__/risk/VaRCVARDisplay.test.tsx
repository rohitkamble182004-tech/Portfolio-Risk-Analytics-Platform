import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VaRCVaRDisplay } from "../../components/risk/VaRCVARDisplay";
import type { RiskMetrics } from "../../types/risk";

const mockMetrics: RiskMetrics = {
  portfolioId: "p1",
  calculatedAt: "2024-06-01T12:00:00Z",
  var: [
    { confidenceLevel: 0.95, horizon: 1,   value: 3200,  pct: 2.56 },
    { confidenceLevel: 0.95, horizon: 5,   value: 7150,  pct: 5.72 },
    { confidenceLevel: 0.95, horizon: 21,  value: 14600, pct: 11.68 },
    { confidenceLevel: 0.99, horizon: 1,   value: 5100,  pct: 4.08 },
    { confidenceLevel: 0.90, horizon: 1,   value: 2100,  pct: 1.68 },
  ],
  cvar: [
    { confidenceLevel: 0.95, horizon: 1,   value: 4500,  pct: 3.60 },
    { confidenceLevel: 0.95, horizon: 5,   value: 9800,  pct: 7.84 },
    { confidenceLevel: 0.99, horizon: 1,   value: 6900,  pct: 5.52 },
    { confidenceLevel: 0.90, horizon: 1,   value: 3200,  pct: 2.56 },
  ],
  sharpeRatio: 1.5,
  sortinoRatio: 2.0,
  beta: 1.0,
  alpha: 0.02,
  maxDrawdown: -8000,
  maxDrawdownPct: -0.064,
  volatilityAnnualized: 0.16,
  trackingError: 0.04,
  informationRatio: 0.5,
};

describe("VaRCVaRDisplay", () => {
  it("renders VaR and CVaR labels", () => {
    render(<VaRCVaRDisplay metrics={mockMetrics} portfolioValue={125000} />);
    expect(screen.getByText(/Value at Risk/)).toBeInTheDocument();
    expect(screen.getByText(/Conditional VaR/)).toBeInTheDocument();
  });

  it("displays default 95% confidence VaR at 1D", () => {
    render(<VaRCVaRDisplay metrics={mockMetrics} portfolioValue={125000} />);
    expect(screen.getByText("$3,200")).toBeInTheDocument();
  });

  it("displays default 95% confidence CVaR at 1D", () => {
    render(<VaRCVaRDisplay metrics={mockMetrics} portfolioValue={125000} />);
    expect(screen.getByText("$4,500")).toBeInTheDocument();
  });

  it("switches to 5D horizon", () => {
    render(<VaRCVaRDisplay metrics={mockMetrics} portfolioValue={125000} />);
    fireEvent.click(screen.getByText("5D"));
    expect(screen.getByText("$7,150")).toBeInTheDocument();
    expect(screen.getByText("$9,800")).toBeInTheDocument();
  });

  it("switches to 99% confidence", () => {
    render(<VaRCVaRDisplay metrics={mockMetrics} portfolioValue={125000} />);
    fireEvent.click(screen.getByText("99%"));
    expect(screen.getByText("$5,100")).toBeInTheDocument();
    expect(screen.getByText("$6,900")).toBeInTheDocument();
  });

  it("shows — when VaR result not available", () => {
    render(<VaRCVaRDisplay metrics={mockMetrics} portfolioValue={125000} />);
    // 1M horizon has no 99% CVaR in mock
    fireEvent.click(screen.getByText("99%"));
    fireEvent.click(screen.getByText("1M"));
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("calls onParamsChange when horizon changes", () => {
    const onChange = jest.fn();
    render(<VaRCVaRDisplay metrics={mockMetrics} portfolioValue={125000} onParamsChange={onChange} />);
    fireEvent.click(screen.getByText("5D"));
    expect(onChange).toHaveBeenCalledWith(5, 0.95);
  });

  it("calls onParamsChange when confidence changes", () => {
    const onChange = jest.fn();
    render(<VaRCVaRDisplay metrics={mockMetrics} portfolioValue={125000} onParamsChange={onChange} />);
    fireEvent.click(screen.getByText("99%"));
    expect(onChange).toHaveBeenCalledWith(1, 0.99);
  });

  it("renders horizon toggle buttons", () => {
    render(<VaRCVaRDisplay metrics={mockMetrics} portfolioValue={125000} />);
    ["1D", "5D", "1M", "3M", "1Y"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("renders confidence toggle buttons", () => {
    render(<VaRCVaRDisplay metrics={mockMetrics} portfolioValue={125000} />);
    ["90%", "95%", "99%"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});