import { useEffect, useState } from "react";
import {
  Bell,
  ChartColumn,
  ClipboardList,
  Coffee,
  History,
  Menu as MenuIcon,
  Package,
  Search,
  Settings,
  ShoppingBag,
  UserRound,
  Users
} from "lucide-react";

import type { StaffUser } from "@coffee-shop/shared/domain/types";

import { CounterOrderPage } from "./pages/CounterOrderPage";
import { BrewQueuePage } from "./pages/BrewQueuePage";
import { DailyActivityPage } from "./pages/DailyActivityPage";
import { LoginPage } from "./pages/LoginPage";
import { MenuMaintenancePage } from "./pages/MenuMaintenancePage";
import { ReportsPage } from "./pages/ReportsPage";
import { LoyaltyPage } from "./pages/LoyaltyPage";
import { ApiClientError } from "./services/apiClient";
import { getCurrentSession, logout } from "./services/authApi";

const navItems = [
  { href: "#counter", label: "Counter Order", icon: Coffee },
  { href: "#queue", label: "Orders", icon: ClipboardList },
  { href: "#history", label: "History", icon: History },
  { href: "#menu", label: "Menu", icon: MenuIcon },
  { href: "#reports", label: "Reports", icon: ChartColumn },
  { href: "#loyalty", label: "Loyalty", icon: Users },
  { href: "#staff", label: "Staff", icon: UserRound },
  { href: "#inventory", label: "Inventory", icon: Package },
  { href: "#settings", label: "Settings", icon: Settings }
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
            <Coffee size={29} strokeWidth={1.8} />
          </span>
          <div>
            <h1>Coffee Shop</h1>
            <p>Staff Operations</p>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                aria-current={activeView === item.href ? "page" : undefined}
                href={item.href}
              >
                <Icon size={22} strokeWidth={1.8} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="sidebar-staff-card">
          <span aria-hidden="true">DB</span>
          <div>
            <strong>{staff.displayName}</strong>
            <small>Downtown Location</small>
          </div>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <label className="global-search">
            <Search size={23} aria-hidden="true" />
            <input placeholder="Search menu items, orders, customers..." />
          </label>
          <div className="topbar-actions">
            <button type="button" className="notification-button" aria-label="Notifications">
              <Bell size={24} />
              <span aria-hidden="true" />
            </button>
            <ShoppingBag size={22} aria-hidden="true" />
          </div>
        </header>

        <main className="workspace">
          {activeView === "#counter" ? (
            <CounterOrderPage />
          ) : activeView === "#queue" ? (
            <BrewQueuePage staff={staff} />
          ) : activeView === "#history" ? (
            <DailyActivityPage />
          ) : activeView === "#menu" ? (
            <MenuMaintenancePage />
          ) : activeView === "#reports" ? (
            <ReportsPage />
          ) : activeView === "#loyalty" ? (
            <LoyaltyPage />
          ) : (
            <section className="placeholder-panel">
              <p className="eyebrow">Planned</p>
              <h3>{navItems.find((item) => item.href === activeView)?.label ?? "Workflow"}</h3>
              <button type="button" onClick={handleLogout}>
                Sign out
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
