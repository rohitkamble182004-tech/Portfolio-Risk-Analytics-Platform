// frontend/components/SidebarNav.tsx 

import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { usePortfolioList } from "../../hooks/usePortfolio";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/portfolio",
    label: "Portfolios",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      </svg>
    ),
  },
  {
    href: "/simulation",
    label: "Simulation",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

const riskItems: NavItem[] = [
  {
    href: "/risk/var",
    label: "VaR / CVaR",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    href: "/risk/stress",
    label: "Stress Tests",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const settingsItems: NavItem[] = [
  {
    href: "/settings",
    label: "Preferences",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
];

export const SidebarNav: React.FC = () => {
  const router = useRouter();
  const { portfolios } = usePortfolioList();
  const portfolioCount = Array.isArray(portfolios) ? portfolios.length : 0;

  const isActive = (item: NavItem) =>
    item.exact ? router.pathname === item.href : router.pathname.startsWith(item.href);

  // Check if any risk item is active
  const isRiskActive = riskItems.some(item => router.pathname.startsWith(item.href));

  return (
    <aside className="app-sidebar">
      <div className="sidebar-section">Main</div>
      {navItems.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${active ? "active" : ""}`}
          >
            <span className="sidebar-item__icon">{item.icon}</span>
            <span className="sidebar-item__label">{item.label}</span>
            {item.href === "/portfolio" && portfolioCount > 0 && (
              <span className="sidebar-badge">{portfolioCount}</span>
            )}
            {active && <span className="sidebar__indicator" />}
          </Link>
        );
      })}

      <div className="sidebar-section" style={{ marginTop: 8 }}>Risk</div>
      {riskItems.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${active ? "active" : ""}`}
          >
            <span className="sidebar-item__icon">{item.icon}</span>
            <span className="sidebar-item__label">{item.label}</span>
            {active && <span className="sidebar__indicator" />}
          </Link>
        );
      })}

      <div className="sidebar-section" style={{ marginTop: 8 }}>Settings</div>
      {settingsItems.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${active ? "active" : ""}`}
          >
            <span className="sidebar-item__icon">{item.icon}</span>
            <span className="sidebar-item__label">{item.label}</span>
            {active && <span className="sidebar__indicator" />}
          </Link>
        );
      })}

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">John Doe</div>
            <div className="sidebar__user-role">Admin</div>
          </div>
        </div>
      </div>

      <style>{`
        /* ─── Sidebar ─── */
        .app-sidebar {
          grid-area: sidebar;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          background: var(--bg-surface);
          border-right: 1px solid var(--border-subtle);
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
        }

        .app-sidebar::-webkit-scrollbar {
          width: 4px;
        }
        .app-sidebar::-webkit-scrollbar-track {
          background: transparent;
        }
        .app-sidebar::-webkit-scrollbar-thumb {
          background: var(--border-base);
          border-radius: 99px;
        }

        .sidebar-section {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          font-family: var(--font-mono);
          padding: 8px 8px 4px 8px;
          margin-top: 4px;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 10px;
          border-radius: var(--r-md);
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 500;
          transition: background 0.12s, color 0.12s;
          position: relative;
        }

        .sidebar-item:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }

        .sidebar-item.active {
          background: var(--bg-elevated);
          color: var(--cyan);
        }

        .sidebar-item__icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-item__icon svg {
          width: 100%;
          height: 100%;
        }

        .sidebar-item__label {
          flex: 1;
        }

        .sidebar-badge {
          margin-left: auto;
          background: var(--cyan);
          color: var(--bg-app);
          font-size: 0.6rem;
          font-weight: 600;
          padding: 0px 6px;
          border-radius: 99px;
          min-width: 18px;
          text-align: center;
          line-height: 18px;
        }

        .sidebar__indicator {
          width: 2px;
          height: 18px;
          background: var(--cyan);
          border-radius: 99px;
          position: absolute;
          right: -1px;
        }

        .sidebar__footer {
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
          margin-top: auto;
        }

        .sidebar__user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 8px;
          border-radius: var(--r-md);
          transition: background 0.15s;
          cursor: default;
        }

        .sidebar__user:hover {
          background: var(--bg-elevated);
        }

        .sidebar__avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: var(--bg-elevated);
          border-radius: 50%;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .sidebar__avatar svg {
          width: 14px;
          height: 14px;
        }

        .sidebar__user-name {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .sidebar__user-role {
          font-size: 0.6rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        /* ─── Tablet (≤1024px) ─── */
        @media (max-width: 1024px) and (min-width: 721px) {
          .app-sidebar {
            padding: 12px 8px;
          }
          .sidebar-item {
            font-size: 0.75rem;
            padding: 5px 8px;
          }
          .sidebar-section {
            font-size: 0.58rem;
          }
          .sidebar-item__icon {
            width: 16px;
            height: 16px;
          }
        }

        /* ─── Mobile (≤900px) ─── */
        @media (max-width: 900px) {
          .app-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </aside>
  );
};