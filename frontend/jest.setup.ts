import "@testing-library/jest-dom";
import React from "react";

// Mock Next.js router
jest.mock("next/router", () => ({
  useRouter: () => ({
    pathname: "/",
    query: {},
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
  }),
}));

// Mock Next.js Link → WITHOUT JSX (fixes your error)
jest.mock("next/link", () => {
  return function MockLink(props: any) {
    const { children, href, ...rest } = props;

    return React.createElement(
      "a",
      { href, ...rest },
      children
    );
  };
});

// Silence React act() warnings
const originalError = console.error;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning:")
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});