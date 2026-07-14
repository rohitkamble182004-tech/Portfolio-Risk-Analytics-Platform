import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      </svg>
    ),
  },
  {
    href: "/simulation",
    label: "Simulation",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

const bottomItems: NavItem[] = [
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
      </svg>
    ),
  },
];

export const SidebarNav: React.FC = () => {
  const router = useRouter();

  const isActive = (item: NavItem) =>
    item.exact ? router.pathname === item.href : router.pathname.startsWith(item.href);

  return (
    <nav className="sidebar">
      <div className="sidebar__section">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`sidebar__item ${isActive(item) ? "sidebar__item--active" : ""}`}>
            <span className="sidebar__icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="sidebar__spacer" />

      <div className="sidebar__section sidebar__section--bottom">
        <div className="sidebar__label">System</div>
        {bottomItems.map((item) => (
          <Link key={item.href} href={item.href} className={`sidebar__item ${isActive(item) ? "sidebar__item--active" : ""}`}>
            <span className="sidebar__icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <style>{`
        .sidebar {
          background: var(--bg-surface);
          border-right: 1px solid var(--border-subtle);
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow-y: auto;
          grid-row: 2;
        }
        .sidebar__section { display: flex; flex-direction: column; gap: 2px; }
        .sidebar__section--bottom { margin-bottom: 0.5rem; }
        .sidebar__label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          padding: 0.4rem 0.75rem 0.25rem;
          font-family: var(--font-mono);
        }
        .sidebar__item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.55rem 0.75rem;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.15s;
          cursor: pointer;
        }
        .sidebar__item:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }
        .sidebar__item--active {
          background: var(--accent-cyan-dim);
          color: var(--accent-cyan);
        }
        .sidebar__item--active .sidebar__icon { color: var(--accent-cyan); }
        .sidebar__icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .sidebar__spacer { flex: 1; }
      `}</style>
    </nav>
  );
};