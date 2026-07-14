import React from "react";
import { render, screen } from "@testing-library/react";
import { Header } from "../../components/Layout/Header";
import { SidebarNav } from "../../components/Layout/SidebarNav";
import { Footer } from "../../components/Layout/Footer";

// ─── Header ──────────────────────────────────────────────────────────────────

describe("Header", () => {
  it("renders brand name", () => {
    render(<Header />);
    expect(screen.getByText("RiskLens")).toBeInTheDocument();
  });

  it("renders portfolio name in breadcrumb when provided", () => {
    render(<Header portfolioName="My Portfolio" />);
    expect(screen.getByText("My Portfolio")).toBeInTheDocument();
  });

  it("does not render breadcrumb separator when no portfolioName", () => {
    render(<Header />);
    expect(screen.queryByText("/")).not.toBeInTheDocument();
  });

  it("renders the user avatar", () => {
    render(<Header />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders Market Status button", () => {
    render(<Header />);
    expect(screen.getByText("Market Status")).toBeInTheDocument();
  });
});

// ─── SidebarNav ───────────────────────────────────────────────────────────────

describe("SidebarNav", () => {
  it("renders all main nav items", () => {
    render(<SidebarNav />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Simulation")).toBeInTheDocument();
  });

  it("renders Settings in bottom nav", () => {
    render(<SidebarNav />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders System section label", () => {
    render(<SidebarNav />);
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("nav items are anchor tags linking to correct hrefs", () => {
    render(<SidebarNav />);
    const dashLink = screen.getByText("Dashboard").closest("a");
    expect(dashLink).toHaveAttribute("href", "/");

    const portfolioLink = screen.getByText("Portfolio").closest("a");
    expect(portfolioLink).toHaveAttribute("href", "/portfolio");

    const simLink = screen.getByText("Simulation").closest("a");
    expect(simLink).toHaveAttribute("href", "/simulation");
  });

  it("active item has active class for current route", () => {
    // useRouter mocked to return pathname: "/"
    render(<SidebarNav />);
    const dashItem = screen.getByText("Dashboard").closest("a");
    expect(dashItem?.className).toContain("sidebar__item--active");
  });
});

// ─── Footer ──────────────────────────────────────────────────────────────────

describe("Footer", () => {
  it("renders copyright year", () => {
    render(<Footer />);
    expect(screen.getByText(/RiskLens ©/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
  });

  it("renders disclaimer", () => {
    render(<Footer />);
    expect(screen.getByText(/Not financial advice/)).toBeInTheDocument();
  });

  it("renders data delay notice", () => {
    render(<Footer />);
    expect(screen.getByText(/Data delayed 15 min/)).toBeInTheDocument();
  });
});