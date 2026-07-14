import { renderHook, act } from "@testing-library/react";
import { useSimulation } from "../../hooks/useSimulation";
import { simulationApi } from "../../services/simulationApi";
import type { SimulationResults } from "../../types/simulation";

jest.mock("../../services/simulationApi");
const mockSimApi = simulationApi as jest.Mocked<typeof simulationApi>;

const mockResults: SimulationResults = {
  simulationId: "sim1",
  portfolioId: "p1",
  params: {
    portfolioId: "p1",
    numSimulations: 1000,
    horizonDays: 252,
    confidenceLevel: 0.95,
    method: "geometric_brownian",
  },
  completedAt: new Date().toISOString(),
  durationMs: 1200,
  initialValue: 100000,
  meanFinalValue: 113000,
  medianFinalValue: 111000,
  stdDevFinalValue: 18000,
  minFinalValue: 55000,
  maxFinalValue: 240000,
  probabilityOfLoss: 0.15,
  probabilityOfDoublingPortfolio: 0.05,
  expectedShortfall: 17000,
  simulationVaR: 14000,
  simulationVaRPct: 0.14,
  percentiles: [],
  distribution: { bins: [], frequencies: [], mean: 113000, median: 111000, stdDev: 18000, skewness: 0.3, kurtosis: 3.0, min: 55000, max: 240000 },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe("useSimulation", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useSimulation("p1"));
    expect(result.current.isRunning).toBe(false);
    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
  });

  it("returns null when portfolioId is null", () => {
    const { result } = renderHook(() => useSimulation(null));
    expect(result.current.isRunning).toBe(false);
  });

  it("sets isRunning to true after runSimulation called", async () => {
    mockSimApi.startSimulation.mockResolvedValue({ simulationId: "sim1" });
    mockSimApi.getStatus.mockResolvedValue({ simulationId: "sim1", status: "running", progress: 10 });

    const { result } = renderHook(() => useSimulation("p1"));

    await act(async () => {
      result.current.runSimulation({ numSimulations: 1000, horizonDays: 252, confidenceLevel: 0.95, method: "geometric_brownian" });
    });

    expect(result.current.isRunning).toBe(true);
  });

  it("sets results when simulation completes", async () => {
    mockSimApi.startSimulation.mockResolvedValue({ simulationId: "sim1" });
    mockSimApi.getStatus.mockResolvedValue({
      simulationId: "sim1",
      status: "completed",
      progress: 100,
      result: mockResults,
    });

    const { result } = renderHook(() => useSimulation("p1"));

    await act(async () => {
      result.current.runSimulation({ numSimulations: 1000, horizonDays: 252, confidenceLevel: 0.95, method: "geometric_brownian" });
    });

    await act(async () => { jest.advanceTimersByTime(1500); });

    expect(result.current.results).toEqual(mockResults);
    expect(result.current.isRunning).toBe(false);
  });

  it("sets error when simulation fails", async () => {
    mockSimApi.startSimulation.mockResolvedValue({ simulationId: "sim1" });
    mockSimApi.getStatus.mockResolvedValue({
      simulationId: "sim1",
      status: "failed",
      progress: 0,
      message: "Out of memory",
    });

    const { result } = renderHook(() => useSimulation("p1"));

    await act(async () => {
      result.current.runSimulation({ numSimulations: 1000, horizonDays: 252, confidenceLevel: 0.95, method: "geometric_brownian" });
    });

    await act(async () => { jest.advanceTimersByTime(1500); });

    expect(result.current.error).toBe("Out of memory");
    expect(result.current.isRunning).toBe(false);
  });

  it("sets error when startSimulation throws", async () => {
    mockSimApi.startSimulation.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useSimulation("p1"));

    await act(async () => {
      await result.current.runSimulation({ numSimulations: 1000, horizonDays: 252, confidenceLevel: 0.95, method: "geometric_brownian" });
    });

    expect(result.current.error).toBe("Server error");
    expect(result.current.isRunning).toBe(false);
  });

  it("resets state when reset() is called", async () => {
    mockSimApi.startSimulation.mockResolvedValue({ simulationId: "sim1" });
    mockSimApi.getStatus.mockResolvedValue({ simulationId: "sim1", status: "completed", progress: 100, result: mockResults });

    const { result } = renderHook(() => useSimulation("p1"));

    await act(async () => {
      result.current.runSimulation({ numSimulations: 1000, horizonDays: 252, confidenceLevel: 0.95, method: "geometric_brownian" });
    });
    await act(async () => { jest.advanceTimersByTime(1500); });

    act(() => { result.current.reset(); });

    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it("does not start simulation when portfolioId is null", async () => {
    const { result } = renderHook(() => useSimulation(null));

    await act(async () => {
      await result.current.runSimulation({ numSimulations: 1000, horizonDays: 252, confidenceLevel: 0.95, method: "geometric_brownian" });
    });

    expect(mockSimApi.startSimulation).not.toHaveBeenCalled();
  });
});