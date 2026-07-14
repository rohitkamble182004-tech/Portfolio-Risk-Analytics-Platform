import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreatePortfolioForm, AddHoldingForm } from "../../components/portfolio/PortfolioForm";

// ─── CreatePortfolioForm ─────────────────────────────────────────────────────

describe("CreatePortfolioForm", () => {
  it("renders form fields", () => {
    render(<CreatePortfolioForm onSubmit={jest.fn()} />);
    expect(screen.getByPlaceholderText(/e.g. Growth Portfolio/)).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByText("Benchmark Ticker")).toBeInTheDocument();
  });

  it("shows validation error when name is empty", async () => {
    render(<CreatePortfolioForm onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByText("Create Portfolio"));
    expect(await screen.findByText("Portfolio name is required")).toBeInTheDocument();
  });

  it("calls onSubmit with correct payload", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<CreatePortfolioForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByPlaceholderText(/e.g. Growth Portfolio/), "My Portfolio");
    fireEvent.click(screen.getByText("Create Portfolio"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "My Portfolio" })
      );
    });
  });

  it("disables inputs when isSubmitting", () => {
    render(<CreatePortfolioForm onSubmit={jest.fn()} isSubmitting />);
    expect(screen.getByPlaceholderText(/e.g. Growth Portfolio/)).toBeDisabled();
    expect(screen.getByText("Create Portfolio").closest("button")).toBeDisabled();
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = jest.fn();
    render(<CreatePortfolioForm onSubmit={jest.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not render cancel button when onCancel not provided", () => {
    render(<CreatePortfolioForm onSubmit={jest.fn()} />);
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });
});

// ─── AddHoldingForm ──────────────────────────────────────────────────────────

describe("AddHoldingForm", () => {
  it("renders all form fields", () => {
    render(<AddHoldingForm onSubmit={jest.fn()} />);
    expect(screen.getByPlaceholderText(/e.g. AAPL/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("100")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("150.00")).toBeInTheDocument();
  });

  it("shows validation errors for empty required fields", async () => {
    render(<AddHoldingForm onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByText("Add Holding"));
    expect(await screen.findByText("Ticker is required")).toBeInTheDocument();
    expect(await screen.findByText("Quantity must be > 0")).toBeInTheDocument();
    expect(await screen.findByText("Average cost must be > 0")).toBeInTheDocument();
  });

  it("uppercases ticker on submit", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<AddHoldingForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByPlaceholderText(/e.g. AAPL/), "aapl");
    await userEvent.type(screen.getByPlaceholderText("100"), "50");
    await userEvent.type(screen.getByPlaceholderText("150.00"), "175");

    fireEvent.click(screen.getByText("Add Holding"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: "AAPL", quantity: 50, avgCost: 175 })
      );
    });
  });

  it("disables submit when isSubmitting", () => {
    render(<AddHoldingForm onSubmit={jest.fn()} isSubmitting />);
    expect(screen.getByText("Add Holding").closest("button")).toBeDisabled();
  });
});