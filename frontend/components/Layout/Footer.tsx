import React from "react";

export const Footer: React.FC = () => (
  <footer className="app-footer">
    <span>RiskLens © {new Date().getFullYear()}</span>
    <span className="app-footer__sep">·</span>
    <span>Data delayed 15 min. Not financial advice.</span>
    <style>{`
      .app-footer {
        grid-column: 2;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 2.5rem;
        font-size: 0.75rem;
        color: var(--text-muted);
        font-family: var(--font-mono);
        border-top: 1px solid var(--border-subtle);
      }
      .app-footer__sep { color: var(--border-strong); }
    `}</style>
  </footer>
);