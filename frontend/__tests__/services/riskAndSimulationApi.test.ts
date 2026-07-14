import { riskApi } from "../../services/riskApi";
import { simulationApi } from "../../services/simulationApi";
import * as apiClient from "../../services/apiClient";
import type { RiskCalculationParams } from "../../types/risk";
import type { MonteCarloParams } from "../../types/simulation";

jest.mock("../../services/apiClient", () => ({
  get:  jest.fn(),
  post: jest.fn(),
  del:  jest.fn(),
}));

const mockGet  = apiClient.get  as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ─── riskApi ──────────────────────────────────────────────────────────────────

describe("riskApi", () => {
  it("getMetrics() calls POST /risk/metrics", async () => {
    mockPost.mockResolvedValue({});
    const params: RiskCalculationParams = {
      portfolioId: "p1", horizon: 1, confidenceLevel: 0.95,
      method: "historical", lookbackDays: 252,
    };
    await riskApi.getMetrics(params);
    expect(mockPost).toHaveBeenCalledWith("/risk/metrics", params);
  });

  it("getLatestMetrics() calls GET /risk/metrics/:id/latest", async () => {
    mockGet.mockResolvedValue({});
    await riskApi.getLatestMetrics("p1");
    expect(mockGet).toHaveBeenCalledWith("/risk/metrics/p1/latest");
  });

  it("getRiskBreakdown() calls GET /risk/breakdown/:id", async () => {
    mockGet.mockResolvedValue({});
    await riskApi.getRiskBreakdown("p1", { confidenceLevel: 0.95, horizon: 1 });
    expect(mockGet).toHaveBeenCalledWith("/risk/breakdown/p1", {
      params: { confidenceLevel: 0.95, horizon: 1 },
    });
  });

  it("getStressScenarios() calls GET /risk/stress-scenarios", async () => {
    mockGet.mockResolvedValue([]);
    await riskApi.getStressScenarios();
    expect(mockGet).toHaveBeenCalledWith("/risk/stress-scenarios");
  });

  it("runStressTest() calls POST /risk/stress-test with correct payload", async () => {
    mockPost.mockResolvedValue({});
    await riskApi.runStressTest("p1", "scenario-gfc");
    expect(mockPost).toHaveBeenCalledWith("/risk/stress-test", {
      portfolioId: "p1",
      scenarioId: "scenario-gfc",
    });
  });

  it("getCorrelationMatrix() calls GET /risk/correlation/:id", async () => {
    mockGet.mockResolvedValue({});
    await riskApi.getCorrelationMatrix("p1", 252);
    expect(mockGet).toHaveBeenCalledWith("/risk/correlation/p1", {
      params: { lookbackDays: 252 },
    });
  });

  it("getCorrelationMatrix() omits params when lookbackDays not provided", async () => {
    mockGet.mockResolvedValue({});
    await riskApi.getCorrelationMatrix("p1");
    expect(mockGet).toHaveBeenCalledWith("/risk/correlation/p1", {
      params: undefined,
    });
  });
});

// ─── simulationApi ────────────────────────────────────────────────────────────

describe("simulationApi", () => {
  const params: MonteCarloParams = {
    portfolioId: "p1", numSimulations: 5000, horizonDays: 252,
    confidenceLevel: 0.95, method: "geometric_brownian",
  };

  it("startSimulation() calls POST /simulation/start", async () => {
    mockPost.mockResolvedValue({ simulationId: "sim1" });
    const result = await simulationApi.startSimulation(params);
    expect(mockPost).toHaveBeenCalledWith("/simulation/start", params);
    expect(result).toEqual({ simulationId: "sim1" });
  });

  it("getStatus() calls GET /simulation/status/:id", async () => {
    mockGet.mockResolvedValue({ status: "running", progress: 42 });
    const result = await simulationApi.getStatus("sim1");
    expect(mockGet).toHaveBeenCalledWith("/simulation/status/sim1");
    expect(result).toEqual({ status: "running", progress: 42 });
  });

  it("getResults() calls GET /simulation/results/:id", async () => {
    mockGet.mockResolvedValue({});
    await simulationApi.getResults("sim1");
    expect(mockGet).toHaveBeenCalledWith("/simulation/results/sim1");
  });

  it("runSync() calls POST /simulation/run-sync", async () => {
    mockPost.mockResolvedValue({});
    await simulationApi.runSync(params);
    expect(mockPost).toHaveBeenCalledWith("/simulation/run-sync", params);
  });

  it("listForPortfolio() calls GET /simulation/history/:portfolioId", async () => {
    mockGet.mockResolvedValue([]);
    await simulationApi.listForPortfolio("p1");
    expect(mockGet).toHaveBeenCalledWith("/simulation/history/p1");
  });

  it("cancel() calls POST /simulation/cancel/:id", async () => {
    mockPost.mockResolvedValue(undefined);
    await simulationApi.cancel("sim1");
    expect(mockPost).toHaveBeenCalledWith("/simulation/cancel/sim1");
  });
});