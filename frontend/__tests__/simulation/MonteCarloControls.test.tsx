import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MonteCarloControls } from "../../components/simulation/MonteCarloControls";

describe("MonteCarloControls", () => {
  const defaultProps = {
    portfolioId: "p1",
    onRun: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("renders simulation method cards", () => {
    render(<MonteCarloControls {...defaultProps} />);
    expect(screen.getByText("GBM")).toBeInTheDocument();
    expect(screen.getByText("Bootstrap")).toBeInTheDocument();
    expect(screen.getByText("Factor")).toBeInTheDocument();
  });

  it("renders parameter dropdowns", () => {
    render(<MonteCarloControls {...defaultProps} />);
    expect(screen.getByText("Simulations")).toBeInTheDocument();
    expect(screen.getByText("Horizon")).toBeInTheDocument();
    expect(screen.getByText("Confidence Level")).toBeInTheDocument();
  });

  it("renders Run Simulation button when not running", () => {
    render(<MonteCarloControls {...defaultProps} />);
    expect(screen.getByText("Run Simulation")).toBeInTheDocument();
  });

  it("renders Cancel button when isRunning", () => {
    render(<MonteCarloControls {...defaultProps} isRunning />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.queryByText("Run Simulation")).not.toBeInTheDocument();
  });

  it("calls onRun with correct defaults when Run clicked", () => {
    const onRun = jest.fn();
    render(<MonteCarloControls {...defaultProps} onRun={onRun} />);
    fireEvent.click(screen.getByText("Run Simulation"));
    expect(onRun).toHaveBeenCalledWith(
      expect.objectContaining({
        numSimulations: 5000,
        horizonDays: 252,
        confidenceLevel: 0.95,
        method: "geometric_brownian",
      })
    );
  });

  it("calls onCancel when Cancel clicked", () => {
    const onCancel = jest.fn();
    render(<MonteCarloControls {...defaultProps} onCancel={onCancel} isRunning />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows progress bar when isRunning", () => {
    render(<MonteCarloControls {...defaultProps} isRunning progress={42} />);
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText(/Running simulation/)).toBeInTheDocument();
  });

  it("selects method when method card clicked", () => {
    const onRun = jest.fn();
    render(<MonteCarloControls {...defaultProps} onRun={onRun} />);
    fireEvent.click(screen.getByText("Bootstrap"));
    fireEvent.click(screen.getByText("Run Simulation"));
    expect(onRun).toHaveBeenCalledWith(
      expect.objectContaining({ method: "historical_bootstrap" })
    );
  });

  it("shows rebalancing frequency input when rebalancing toggled on", () => {
    render(<MonteCarloControls {...defaultProps} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(screen.getByText("Rebalance every N days")).toBeInTheDocument();
  });

  it("disables method cards when isRunning", () => {
    render(<MonteCarloControls {...defaultProps} isRunning />);
    const gbmCard = screen.getByText("GBM").closest("button");
    expect(gbmCard).toBeDisabled();
  });
});