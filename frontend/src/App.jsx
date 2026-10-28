import { useCallback, useEffect, useState } from "react";
import "./App.css";
import Inventory from "./Inventory";
import Sales from "./Sales";

const navigation = [
  { section: "MAIN", items: [{ name: "Dashboard", icon: "▦" }] },
  {
    section: "BUSINESS",
    items: [
      { name: "Products & Stock", icon: "▤" },

      { name: "Sales", icon: "↗" },
      { name: "Purchases", icon: "↙" },
      { name: "Customers", icon: "♙" },
      { name: "Suppliers", icon: "♧" },
    ],
  },
  {
    section: "MANAGEMENT",
    items: [
      { name: "Expenses", icon: "◉" },
      { name: "Reports", icon: "▥" },
      { name: "Settings", icon: "⚙" },
    ],
  },
];

const stockItems = [
  {
    name: "Broiler Starter Feed",
    category: "Poultry Feed",
    stock: 8,
    unit: "bags",
    level: "Critical",
  },
  {
    name: "Layer Feed",
    category: "Poultry Feed",
    stock: 14,
    unit: "bags",
    level: "Low",
  },
  {
    name: "Calf Starter Feed",
    category: "Cattle Feed",
    stock: 6,
    unit: "bags",
    level: "Critical",
  },
  {
    name: "Wheat Bran",
    category: "Feed Ingredient",
    stock: 18,
    unit: "bags",
    level: "Low",
  },
];

const money = (value) => "Rs. " + value.toLocaleString("en-PK");
const number = (value) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

// Main application component that renders the dashboard and section navigation.
function App() {
  // Tracks the currently selected navigation page in the left sidebar.
  const [activePage, setActivePage] = useState("Dashboard");
  // Stores the selected sales reporting period.
  const [period, setPeriod] = useState("This week");
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [movementsError, setMovementsError] = useState("");
  const [dailySales, setDailySales] = useState(null);
  const [dailySalesLoading, setDailySalesLoading] = useState(true);
  const [dailySalesError, setDailySalesError] = useState("");

  const loadMovements = useCallback(async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/stock-movements/",
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Unable to load stock movements.");
      }
      setMovements(Array.isArray(data) ? data : data.results || []);
      setMovementsError("");
    } catch (error) {
      setMovementsError(error.message);
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  const refreshMovements = useCallback(() => {
    setMovementsLoading(true);
    return loadMovements();
  }, [loadMovements]);

  const loadDailySales = useCallback(async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/dashboard/daily-sales/",
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Unable to load daily sales.");
      }
      setDailySales(Number(data.total_sales || 0));
      setDailySalesError("");
    } catch (error) {
      setDailySalesError(error.message);
    } finally {
      setDailySalesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovements();
    loadDailySales();
  }, [loadDailySales, loadMovements]);

  const recentMovements = movements.slice(0, 10);

  return (
    // Primary application shell containing the sidebar and main content area.
    <div className="app-shell">
      {/* Left navigation panel with brand, menu groups, and workspace status. */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <h1>Rajpoot Traders</h1>
            <span>INVENTORY MANAGEMENT</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((group) => (
            <div className="nav-group" key={group.section}>
              <div className="nav-heading">{group.section}</div>
              {group.items.map((item) => (
                <button
                  key={item.name}
                  className={`nav-item ${
                    activePage === item.name ? "active" : ""
                  }`}
                  onClick={() => setActivePage(item.name)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.name}</span>
                  {item.name === "Products & Stock" && (
                    <span className="nav-count">4</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-dot" />
          <div>
            <strong>Local workspace</strong>
            <span>Desktop application</span>
          </div>
        </div>
      </aside>

      {/* Main content area for the selected business page. */}
      <main className="main-area">
        {/* Top header with current page breadcrumb and user details. */}
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <div className="system-status">
              <span className="status-dot" />
              Local mode
            </div>
            <div className="topbar-divider" />
            <div className="avatar">HA</div>
            <div className="user-info">
              <strong>Administrator</strong>
              <span>Business owner</span>
            </div>
          </div>
        </header>

        {activePage === "Dashboard" ? (
          // Dashboard view with overview stats, charts, alerts, and recent transactions.
          <div className="page-content">
            {/* Welcome section and primary action button. */}
            <section className="welcome-row">
              <div>
                <div className="eyebrow">BUSINESS OVERVIEW</div>
                <h2>Good evening 👋</h2>
                <p>Here's what's happening with your business today.</p>
              </div>

              <button
                className="primary-button"
                onClick={() => setActivePage("Sales")}
              >
                <span>＋</span> New transaction
              </button>
            </section>

            {/* Summary cards for key business metrics. */}
            <section className="stats-grid">
              <article className="stat-card">
                <div className="stat-top">
                  <span>Daily sales</span>
                  <span className="stat-icon blue">↗</span>
                </div>
                <h3>
                  {dailySalesLoading
                    ? "Loading..."
                    : dailySales === null
                      ? "—"
                      : money(dailySales)}
                </h3>
                <div className="stat-bottom">
                  <span
                    className={`trend ${dailySalesError ? "warning" : "neutral"}`}
                  >
                    {dailySalesError ? "Unavailable" : "Today"}
                  </span>
                  <span>
                    {dailySalesError
                      ? "could not load sales"
                      : "at current product prices"}
                  </span>
                </div>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Total purchases</span>
                  <span className="stat-icon purple">↙</span>
                </div>
                <h3>{money(196000)}</h3>
                <div className="stat-bottom">
                  <span className="trend neutral">This week</span>
                  <span>supplier purchases</span>
                </div>
                <div className="mini-bars purple-bars">
                  {[65, 40, 58, 34, 75, 52, 85, 60, 45, 90, 68, 78].map(
                    (height, i) => (
                      <i key={i} style={{ height: `${height}%` }} />
                    ),
                  )}
                </div>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Inventory value</span>
                  <span className="stat-icon green">▤</span>
                </div>
                <h3>{money(1250000)}</h3>
                <div className="stat-bottom">
                  <span className="trend positive">In stock</span>
                  <span>estimated cost value</span>
                </div>
                <div className="inventory-meter">
                  <div />
                </div>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Outstanding credit</span>
                  <span className="stat-icon orange">◷</span>
                </div>
                <h3>{money(87300)}</h3>
                <div className="stat-bottom">
                  <span className="trend warning">To collect</span>
                  <span>customer balances</span>
                </div>
                <div className="credit-track">
                  <div />
                </div>
              </article>
            </section>

            {/* Insight panels for sales chart and low-stock alerts. */}
            <section className="insight-grid">
              <article className="panel sales-panel">
                <div className="panel-header">
                  <div>
                    <h3>Sales overview</h3>
                    <p>Track your sales performance</p>
                  </div>
                  <select
                    value={period}
                    onChange={(event) => setPeriod(event.target.value)}
                    aria-label="Sales chart period"
                  >
                    <option>This week</option>
                    <option>This month</option>
                  </select>
                </div>

                <div className="chart-summary">
                  <div>
                    <span className="muted-label">Total revenue</span>
                    <h3>{money(period === "This week" ? 284500 : 986200)}</h3>
                  </div>
                  <span className="chart-legend">
                    <i /> Sales revenue
                  </span>
                </div>

                <div className="chart">
                  <div className="chart-grid">
                    <span>80k</span>
                    <span>60k</span>
                    <span>40k</span>
                    <span>20k</span>
                    <span>0</span>
                  </div>
                  <div className="chart-bars">
                    {(period === "This week"
                      ? [
                          ["Mon", 45],
                          ["Tue", 68],
                          ["Wed", 38],
                          ["Thu", 82],
                          ["Fri", 58],
                          ["Sat", 95],
                          ["Sun", 72],
                        ]
                      : [
                          ["Week 1", 45],
                          ["Week 2", 70],
                          ["Week 3", 55],
                          ["Week 4", 90],
                        ]
                    ).map(([label, height]) => (
                      <div className="chart-column" key={label}>
                        <div className="bar-area">
                          <div
                            className="chart-bar"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="panel stock-panel">
                <div className="panel-header">
                  <div>
                    <h3>Low stock alerts</h3>
                    <p>Products that need attention</p>
                  </div>
                  <span className="alert-count">{stockItems.length}</span>
                </div>

                <div className="stock-list">
                  {stockItems.map((item) => (
                    <div className="stock-row" key={item.name}>
                      <div className="product-symbol">▤</div>
                      <div className="stock-product">
                        <strong>{item.name}</strong>
                        <span>{item.category}</span>
                      </div>
                      <div className="stock-quantity">
                        <strong>
                          {item.stock} {item.unit}
                        </strong>
                        <span
                          className={
                            item.level === "Critical" ? "critical" : "low"
                          }
                        >
                          {item.level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="text-button"
                  onClick={() => setActivePage("Products & Stock")}
                >
                  View all inventory <span>→</span>
                </button>
              </article>
            </section>

            {/* Recent transactions table for the dashboard. */}
            <section className="panel transactions-panel">
              <div className="panel-header transaction-heading">
                <div>
                  <h3>Recent transactions</h3>
                  <p>The same latest stock movements shown in inventory</p>
                </div>
                <div className="transaction-actions">
                  <button
                    className="secondary-button"
                    onClick={refreshMovements}
                  >
                    ↻ Refresh
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => setActivePage("Products & Stock")}
                  >
                    View inventory
                  </button>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>PRODUCT</th>
                      <th>TYPE</th>
                      <th>QUANTITY</th>
                      <th>REFERENCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMovements.map((movement) => (
                      <tr key={movement.id}>
                        <td className="date-cell">
                          {movement.created_at
                            ? new Date(movement.created_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="party-name">
                          {movement.product_name ||
                            `Product #${movement.product}`}
                        </td>
                        <td>
                          {movement.movement_type?.replaceAll("_", " ") || "—"}
                        </td>
                        <td className="amount-cell">
                          {number(movement.quantity)}
                        </td>
                        <td className="reference">
                          {movement.reference || "—"}
                        </td>
                      </tr>
                    ))}
                    {movementsLoading && recentMovements.length === 0 && (
                      <tr>
                        <td colSpan="5" className="empty-state">
                          Loading recent stock movements...
                        </td>
                      </tr>
                    )}
                    {!movementsLoading &&
                      movementsError &&
                      recentMovements.length === 0 && (
                        <tr>
                          <td colSpan="5" className="empty-state">
                            {movementsError}
                          </td>
                        </tr>
                      )}
                    {!movementsLoading &&
                      !movementsError &&
                      recentMovements.length === 0 && (
                        <tr>
                          <td colSpan="5" className="empty-state">
                            No stock movements recorded yet.
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                Showing {recentMovements.length} latest stock movements
                {movementsError && recentMovements.length > 0
                  ? ` · Refresh failed: ${movementsError}`
                  : ""}
              </div>
            </section>

            {/* Footer content for the current page. */}
            <footer className="page-footer">
              <span>TradeSoft © 2026</span>
              <span>Inventory management made simple.</span>
            </footer>
          </div>
        ) : activePage === "Products & Stock" ? (
          // Show the inventory page when Products & Stock is selected.
          <Inventory
            movements={movements}
            movementsLoading={movementsLoading}
            movementsError={movementsError}
            onRefreshMovements={refreshMovements}
          />
        ) : activePage === "Sales" ? (
          <Sales
            movements={movements}
            movementsLoading={movementsLoading}
            movementsError={movementsError}
            onRefreshMovements={refreshMovements}
          />
        ) : (
          // Fallback content for other navigation sections not yet implemented.
          <div className="placeholder-page">
            <div className="placeholder-icon">▦</div>
            <div className="eyebrow">TRADEsoft WORKSPACE</div>
            <h2>{activePage}</h2>
            <p>
              This section is ready for us to build next. Its business logic and
              database integration have not been implemented yet.
            </p>
            <button
              className="primary-button"
              onClick={() => setActivePage("Dashboard")}
            >
              ← Back to dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
