import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

interface HeaderProps {
  portfolioName?: string;
}

export const Header: React.FC<HeaderProps> = ({ portfolioName }) => {
  const router = useRouter();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="1" y="1" width="9" height="9" rx="2" fill="var(--accent-cyan)" opacity="0.9" />
          <rect x="12" y="1" width="9" height="9" rx="2" fill="var(--accent-blue)" opacity="0.7" />
          <rect x="1" y="12" width="9" height="9" rx="2" fill="var(--accent-blue)" opacity="0.5" />
          <rect x="12" y="12" width="9" height="9" rx="2" fill="var(--accent-cyan)" opacity="0.3" />
        </svg>
        <span className="app-header__brand-name">RiskLens</span>
      </div>

      {portfolioName && (
        <div className="app-header__context">
          <span className="app-header__context-sep">/</span>
          <span className="app-header__context-name">{portfolioName}</span>
        </div>
      )}

      <div className="app-header__actions">
        <button className="btn btn-ghost" style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          Market Status
        </button>

        <div className="app-header__avatar">JD</div>
      </div>

      <style>{`
        .app-header {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0 1.5rem;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-subtle);
          height: var(--header-h);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .app-header__brand {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          text-decoration: none;
          color: inherit;
        }
        .app-header__brand-name {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }
        .app-header__context {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-left: 0.25rem;
        }
        .app-header__context-sep {
          color: var(--text-muted);
          font-size: 1.2rem;
        }
        .app-header__context-name {
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .app-header__actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-left: auto;
        }
        .app-header__avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-inverse);
          cursor: pointer;
        }
      `}</style>
    </header>
  );
};