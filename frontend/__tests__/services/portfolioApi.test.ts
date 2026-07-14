import { portfolioApi } from "../../services/portfolioApi";
import * as apiClient from "../../services/apiClient";
import type { Portfolio, PortfolioSummary } from "../../types/portfolio";

jest.mock("../../services/apiClient", () => ({
  get:   jest.fn(),
  post:  jest.fn(),
  put:   jest.fn(),
  patch: jest.fn(),
  del:   jest.fn(),
}));

const mockGet   = apiClient.get   as jest.Mock;
const mockPost  = apiClient.post  as jest.Mock;
const mockPatch = apiClient.patch as jest.Mock;
const mockDel   = apiClient.del   as jest.Mock;

const mockPortfolio: Portfolio = {
  id: "p1", name: "Test", currency: "USD",
  totalValue: 100000, totalCost: 80000, totalGainLoss: 20000, totalGainLossPct: 25,
  holdings: [], createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-06-01T00:00:00Z",
};

const mockSummary: PortfolioSummary = {
  id: "p1", name: "Test", totalValue: 100000, totalGainLossPct: 25, holdingsCount: 0, updatedAt: "2024-06-01T00:00:00Z",
};

beforeEach(() => jest.clearAllMocks());

describe("portfolioApi", () => {
  it("list() calls GET /portfolios", async () => {
    mockGet.mockResolvedValue([mockSummary]);
    const result = await portfolioApi.list();
    expect(mockGet).toHaveBeenCalledWith("/portfolios");
    expect(result).toEqual([mockSummary]);
  });

  it("getById() calls GET /portfolios/:id", async () => {
    mockGet.mockResolvedValue(mockPortfolio);
    const result = await portfolioApi.getById("p1");
    expect(mockGet).toHaveBeenCalledWith("/portfolios/p1");
    expect(result).toEqual(mockPortfolio);
  });

  it("create() calls POST /portfolios", async () => {
    mockPost.mockResolvedValue(mockPortfolio);
    const payload = { name: "New", currency: "USD" };
    const result = await portfolioApi.create(payload);
    expect(mockPost).toHaveBeenCalledWith("/portfolios", payload);
    expect(result).toEqual(mockPortfolio);
  });

  it("update() calls PATCH /portfolios/:id", async () => {
    mockPatch.mockResolvedValue(mockPortfolio);
    const result = await portfolioApi.update("p1", { name: "Updated" });
    expect(mockPatch).toHaveBeenCalledWith("/portfolios/p1", { name: "Updated" });
    expect(result).toEqual(mockPortfolio);
  });

  it("delete() calls DEL /portfolios/:id", async () => {
    mockDel.mockResolvedValue(undefined);
    await portfolioApi.delete("p1");
    expect(mockDel).toHaveBeenCalledWith("/portfolios/p1");
  });

  it("addHolding() calls POST /portfolios/:id/holdings", async () => {
    mockPost.mockResolvedValue(mockPortfolio);
    const holding = { ticker: "AAPL", quantity: 10, avgCost: 150, assetClass: "equity" as const };
    await portfolioApi.addHolding("p1", holding);
    expect(mockPost).toHaveBeenCalledWith("/portfolios/p1/holdings", holding);
  });

  it("updateHolding() calls PATCH /portfolios/:id/holdings/:hId", async () => {
    mockPatch.mockResolvedValue(mockPortfolio);
    await portfolioApi.updateHolding("p1", "h1", { quantity: 20 });
    expect(mockPatch).toHaveBeenCalledWith("/portfolios/p1/holdings/h1", { quantity: 20 });
  });

  it("removeHolding() calls DEL /portfolios/:id/holdings/:hId", async () => {
    mockDel.mockResolvedValue(mockPortfolio);
    await portfolioApi.removeHolding("p1", "h1");
    expect(mockDel).toHaveBeenCalledWith("/portfolios/p1/holdings/h1");
  });

  it("getSectorAllocation() calls GET /portfolios/:id/allocations/sector", async () => {
    mockGet.mockResolvedValue([]);
    await portfolioApi.getSectorAllocation("p1");
    expect(mockGet).toHaveBeenCalledWith("/portfolios/p1/allocations/sector");
  });

  it("getAssetClassAllocation() calls GET /portfolios/:id/allocations/asset-class", async () => {
    mockGet.mockResolvedValue([]);
    await portfolioApi.getAssetClassAllocation("p1");
    expect(mockGet).toHaveBeenCalledWith("/portfolios/p1/allocations/asset-class");
  });

  it("getPerformance() calls GET with optional params", async () => {
    mockGet.mockResolvedValue([]);
    await portfolioApi.getPerformance("p1", { startDate: "2024-01-01" });
    expect(mockGet).toHaveBeenCalledWith("/portfolios/p1/performance", { params: { startDate: "2024-01-01" } });
  });

  it("refreshPrices() calls POST /portfolios/:id/refresh-prices", async () => {
    mockPost.mockResolvedValue(mockPortfolio);
    await portfolioApi.refreshPrices("p1");
    expect(mockPost).toHaveBeenCalledWith("/portfolios/p1/refresh-prices");
  });
});