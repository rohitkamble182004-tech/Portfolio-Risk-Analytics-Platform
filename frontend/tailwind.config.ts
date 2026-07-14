import type { Config } from "tailwindcss";
import { tailwindThemeExtension } from "./styles/theme";

const config: Config = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./styles/**/*.{ts,tsx,css}",
  ],
  theme: {
    extend: {
      ...tailwindThemeExtension,
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
      boxShadow: {
        sm:   "0 1px 3px rgba(0,0,0,0.4)",
        md:   "0 4px 16px rgba(0,0,0,0.5)",
        lg:   "0 8px 32px rgba(0,0,0,0.6)",
        cyan: "0 0 20px rgba(0,229,204,0.25)",
        blue: "0 0 20px rgba(77,124,254,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;