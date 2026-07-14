import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { PortfolioHoldingsTable } from "../../components/portfolio/PortfolioHoldingsTable";
import type { Holding } from "../../types/portfolio";

const mockHoldings: Holding[] = [
  {
    id: "h1",
    ticker: "AAPL",
    name: "Apple Inc.",
    quantity: 100,
    avgCost: 150,
    currentPrice: 180,
    marketValue: 18000,
    weight: 0.45,
    gainLoss: 3000,
    gainLossPct: 20,
    sector: "Technology",
    assetClass: "equity",
  },
  {
    id: "h2",
    ticker: "MSFT",
    name: "Microsoft Corp.",
    quantity: 50,
    avgCost: 300,
    currentPrice: 280,
    marketValue: 14000,
    weight: 0.35,
    gainLoss: -1000,
    gainLossPct: -6.67,
    sector: "Technology",
    assetClass: "equity",
  },
  {
    id: "h3",
    ticker: "GLD",
    name: "SPDR Gold Shares",
    quantity: 30,
    avgCost: 180,
    currentPrice: 195,
    marketValue: 5850,
    weight: 0.20,
    gainLoss: 450,
    gainLossPct: 8.33,
    sector: "Commodities",
    assetClass: "commodity",
  },
];

describe("PortfolioHoldingsTable", () => {
  it("renders all holdings by default", () => {
    render(<PortfolioHoldingsTable holdings={mockHoldings} />);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();
    expect(screen.getByText("GLD")).toBeInTheDocument();
  });

  it("shows loading spinner when isLoading is true", () => {
    render(<PortfolioHoldingsTable holdings={[]} isLoading />);
    expect(screen.getByText(/Loading holdings/)).toBeInTheDocument();
  });

  it("shows empty state when no holdings match filter", () => {
    render(<PortfolioHoldingsTable holdings={mockHoldings} />);
    const input = screen.getByPlaceholderText(/Filter by ticker/);
    fireEvent.change(input, { target: { value: "ZZZZ" } });
    expect(screen.getByText("No holdings found.")).toBeInTheDocument();
  });

  it("filters by ticker", () => {
    render(<PortfolioHoldingsTable holdings={mockHoldings} />);
    const input = screen.getByPlaceholderText(/Filter by ticker/);
    fireEvent.change(input, { target: { value: "AAPL" } });
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.queryByText("MSFT")).not.toBeInTheDocument();
  });

  it("filters by sector", () => {
    render(<PortfolioHoldingsTable holdings={mockHoldings} />);
    const input = screen.getByPlaceholderText(/Filter by ticker/);
    fireEvent.change(input, { target: { value: "Commodities" } });
    expect(screen.getByText("GLD")).toBeInTheDocument();
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
  });

  it("shows count of visible holdings", () => {
    render(<PortfolioHoldingsTable holdings={mockHoldings} />);
    expect(screen.getByText("3 holdings")).toBeInTheDocument();
  });

  it("calls onRemove when remove button clicked", () => {
    const onRemove = jest.fn();
    render(<PortfolioHoldingsTable holdings={mockHoldings} onRemove={onRemove} />);
    const removeButtons = screen.getAllByText("✕");
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("calls onEdit when edit button clicked", () => {
    const onEdit = jest.fn();
    render(<PortfolioHoldingsTable holdings={mockHoldings} onEdit={onEdit} />);
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(mockHoldings[0]);
  });

  it("shows positive return in pos class", () => {
    render(<PortfolioHoldingsTable holdings={mockHoldings} />);
    expect(screen.getByText("+20.00%")).toHaveClass("pos");
  });

  it("shows negative return in neg class", () => {
    render(<PortfolioHoldingsTable holdings={mockHoldings} />);
    expect(screen.getByText("-6.67%")).toHaveClass("neg");
  });

  it("sorts by ticker ascending when clicked", () => {
    render(<PortfolioHoldingsTable holdings={mockHoldings} />);
    const tickerHeader = screen.getByText(/Ticker/);
    fireEvent.click(tickerHeader); // desc
    fireEvent.click(tickerHeader); // asc
    const tickers = screen.getAllByText(/^(AAPL|MSFT|GLD)$/);
    expect(tickers[0].textContent).toBe("AAPL");
  });
});