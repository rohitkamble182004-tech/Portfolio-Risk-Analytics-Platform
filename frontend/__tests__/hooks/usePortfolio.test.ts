import { renderHook, act, waitFor } from "@testing-library/react";
import { usePortfolio, usePortfolioList, usePortfolioMutations } from "../../hooks/usePortfolio";
import { portfolioApi } from "../../services/portfolioApi";
import type { Portfolio, PortfolioSummary } from "../../types/portfolio";

jest.mock("../../services/portfolioApi");
const mockApi = portfolioApi as jest.Mocked<typeof portfolioApi>;

const mockSummary: PortfolioSummary = {
  id: "p1",
  name: "Growth Portfolio",
  totalValue: 125000,
  totalGainLossPct: 25,
  holdingsCount: 5,
  updatedAt: "2024-06-01T00:00:00Z",
};

const mockPortfolio: Portfolio = {
  id: "p1",
  name: "Growth Portfolio",
  currency: "USD",
  totalValue: 125000,
  totalCost: 100000,
  totalGainLoss: 25000,
  totalGainLossPct: 25,
  holdings: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

beforeEach(() => jest.clearAllMocks());

// ─── usePortfolioList ─────────────────────────────────────────────────────────

describe("usePortfolioList", () => {
  it("fetches portfolios on mount", async () => {
    mockApi.list.mockResolvedValue([mockSummary]);
    const { result } = renderHook(() => usePortfolioList());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.portfolios).toEqual([mockSummary]);
    expect(mockApi.list).toHaveBeenCalledTimes(1);
  });

  it("returns empty array when API fails", async () => {
    mockApi.list.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => usePortfolioList());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.portfolios).toEqual([]);
    expect(result.current.isError).toBe(true);
  });

  it("re-fetches on refresh()", async () => {
    mockApi.list.mockResolvedValue([mockSummary]);
    const { result } = renderHook(() => usePortfolioList());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { result.current.refresh(); });

    expect(mockApi.list).toHaveBeenCalledTimes(2);
  });
});

// ─── usePortfolio ─────────────────────────────────────────────────────────────

describe("usePortfolio", () => {
  it("fetches portfolio by id on mount", async () => {
    mockApi.getById.mockResolvedValue(mockPortfolio);
    const { result } = renderHook(() => usePortfolio("p1"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.portfolio).toEqual(mockPortfolio);
    expect(mockApi.getById).toHaveBeenCalledWith("p1");
  });

  it("does not fetch when portfolioId is null", () => {
    const { result } = renderHook(() => usePortfolio(null));
    expect(mockApi.getById).not.toHaveBeenCalled();
    expect(result.current.portfolio).toBeNull();
  });

  it("re-fetches on refresh()", async () => {
    mockApi.getById.mockResolvedValue(mockPortfolio);
    const { result } = renderHook(() => usePortfolio("p1"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { result.current.refresh(); });

    expect(mockApi.getById).toHaveBeenCalledTimes(2);
  });
});

// ─── usePortfolioMutations ────────────────────────────────────────────────────

describe("usePortfolioMutations", () => {
  it("starts with isSubmitting false", () => {
    const { result } = renderHook(() => usePortfolioMutations());
    expect(result.current.isSubmitting).toBe(false);
  });

  it("creates a portfolio successfully", async () => {
    mockApi.create.mockResolvedValue(mockPortfolio);
    const { result } = renderHook(() => usePortfolioMutations());

    let returned: Portfolio | null = null;
    await act(async () => {
      returned = await result.current.createPortfolio({ name: "New", currency: "USD" });
    });

    expect(returned).toEqual(mockPortfolio);
    expect(result.current.mutationError).toBeNull();
  });

  it("sets mutationError on failure", async () => {
    mockApi.create.mockRejectedValue(new Error("Server error"));
    const { result } = renderHook(() => usePortfolioMutations());

    await act(async () => {
      await result.current.createPortfolio({ name: "New", currency: "USD" });
    });

    expect(result.current.mutationError).toBe("Server error");
  });

  it("clears error on clearError()", async () => {
    mockApi.create.mockRejectedValue(new Error("err"));
    const { result } = renderHook(() => usePortfolioMutations());

    await act(async () => { await result.current.createPortfolio({ name: "x", currency: "USD" }); });
    act(() => { result.current.clearError(); });

    expect(result.current.mutationError).toBeNull();
  });

  it("calls addHolding with correct args", async () => {
    mockApi.addHolding.mockResolvedValue(mockPortfolio);
    const { result } = renderHook(() => usePortfolioMutations());

    await act(async () => {
      await result.current.addHolding("p1", { ticker: "AAPL", quantity: 10, avgCost: 150, assetClass: "equity" });
    });

    expect(mockApi.addHolding).toHaveBeenCalledWith("p1", expect.objectContaining({ ticker: "AAPL" }));
  });

  it("calls removeHolding with correct args", async () => {
    mockApi.removeHolding.mockResolvedValue(mockPortfolio);
    const { result } = renderHook(() => usePortfolioMutations());

    await act(async () => { await result.current.removeHolding("p1", "h1"); });

    expect(mockApi.removeHolding).toHaveBeenCalledWith("p1", "h1");
  });

  it("calls refreshPrices with correct portfolio id", async () => {
    mockApi.refreshPrices.mockResolvedValue(mockPortfolio);
    const { result } = renderHook(() => usePortfolioMutations());

    await act(async () => { await result.current.refreshPrices("p1"); });

    expect(mockApi.refreshPrices).toHaveBeenCalledWith("p1");
  });
});