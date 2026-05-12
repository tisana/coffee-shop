import { useEffect, useState } from "react";

import type { StaffUser } from "@coffee-shop/shared/domain/types";

import { CounterOrderPage } from "./pages/CounterOrderPage";
import { LoginPage } from "./pages/LoginPage";
import { ApiClientError } from "./services/apiClient";
import { getCurrentSession, logout } from "./services/authApi";

const navItems = [
  { href: "#counter", label: "Counter" },
  { href: "#queue", label: "Brew Queue" },
  { href: "#menu", label: "Menu" },
  { href: "#history", label: "Activity" }
];

export function App() {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activeView, setActiveView] = useState(() => window.location.hash || "#counter");

  useEffect(() => {
    getCurrentSession()
      .then(setStaff)
      .catch((caught) => {
        if (!(caught instanceof ApiClientError && caught.status === 401)) {
          console.error(caught);
        }
      })
      .finally(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    function handleHashChange() {
      setActiveView(window.location.hash || "#counter");
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  async function handleLogout() {
    await logout();
    setStaff(null);
  }

  if (sessionLoading) {
    return (
      <main className="login-layout">
        <p className="empty-state">Loading staff session.</p>
      </main>
    );
  }

  if (!staff) {
    return <LoginPage onSessionStarted={setStaff} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Staff navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            CS
          </span>
          <div>
            <h1>Coffee Shop</h1>
            <p>Staff Operations</p>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <a
              key={item.href}
              aria-current={activeView === item.href ? "page" : undefined}
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Today</p>
            <h2>Service Dashboard</h2>
          </div>
          <div className="session-actions">
            <span className="session-pill">{staff.displayName}</span>
            <button type="button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        <main className="workspace">
          {activeView === "#counter" ? (
            <CounterOrderPage />
          ) : (
            <section className="placeholder-panel">
              <p className="eyebrow">Planned</p>
              <h3>{navItems.find((item) => item.href === activeView)?.label ?? "Workflow"}</h3>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
