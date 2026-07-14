// Design token mirror of globals.css CSS variables for use in JS/TS contexts
// (e.g. Recharts, Canvas, programmatic colour usage)

export const colors = {
  bg: {
    base:     "#050608",
    surface:  "#0c0e12",
    elevated: "#131620",
    overlay:  "#1a1e2a",
  },
  border: {
    subtle: "rgba(255,255,255,0.06)",
    base:   "rgba(255,255,255,0.10)",
    strong: "rgba(255,255,255,0.18)",
  },
  text: {
    primary:   "#f0f2f7",
    secondary: "#8891a8",
    muted:     "#4a5168",
    inverse:   "#050608",
  },
  accent: {
    cyan:    "#00e5cc",
    cyanDim: "rgba(0,229,204,0.12)",
    blue:    "#4d7cfe",
    blueDim: "rgba(77,124,254,0.12)",
  },
  semantic: {
    green:     "#22c55e",
    greenDim:  "rgba(34,197,94,0.12)",
    red:       "#ef4444",
    redDim:    "rgba(239,68,68,0.12)",
    yellow:    "#f59e0b",
    yellowDim: "rgba(245,158,11,0.12)",
  },
} as const;

export const fonts = {
  display: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
  mono:    "'DM Mono', monospace",
} as const;

export const radius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
} as const;

// Recharts-friendly chart palette
export const chartPalette = [
  colors.accent.cyan,
  colors.accent.blue,
  colors.semantic.green,
  colors.semantic.yellow,
  "#a78bfa", // violet
  "#fb923c", // orange
  "#38bdf8", // sky
  "#f472b6", // pink
] as const;

// Tailwind config extension (used in tailwind.config.ts)
export const tailwindThemeExtension = {
  colors: {
    "bg-base":     colors.bg.base,
    "bg-surface":  colors.bg.surface,
    "bg-elevated": colors.bg.elevated,
    "bg-overlay":  colors.bg.overlay,
    "accent-cyan": colors.accent.cyan,
    "accent-blue": colors.accent.blue,
    "text-primary": colors.text.primary,
    "text-secondary": colors.text.secondary,
    "text-muted":   colors.text.muted,
    positive:       colors.semantic.green,
    negative:       colors.semantic.red,
    warning:        colors.semantic.yellow,
  },
  fontFamily: {
    display: ["Syne", "sans-serif"],
    body:    ["DM Sans", "sans-serif"],
    mono:    ["DM Mono", "monospace"],
  },
};