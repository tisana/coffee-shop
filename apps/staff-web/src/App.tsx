const navItems = [
  { href: "#counter", label: "Counter" },
  { href: "#queue", label: "Brew Queue" },
  { href: "#menu", label: "Menu" },
  { href: "#history", label: "Activity" }
];

export function App() {
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
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Today</p>
            <h2>Service Dashboard</h2>
          </div>
          <span className="session-pill">Signed out</span>
        </header>

        <section className="workspace" aria-labelledby="workspace-title">
          <div>
            <p className="eyebrow">Foundation Ready</p>
            <h3 id="workspace-title">Staff workflows will load here</h3>
            <p>
              The app shell, navigation, and API client are ready for the first
              order-taking story.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
