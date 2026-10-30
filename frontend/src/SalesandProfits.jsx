import { useState, useEffect, useCallback, useMemo } from "react";
import "./SalesandProfits.css";

const API = "http://127.0.0.1:8000/api";

const number = (value) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data === "object"
        ? Object.entries(data)
            .map(([key, value]) =>
              `${key}: ${Array.isArray(value) ? value.join(", ") : value}`,
            )
            .join("\\n")
        : "The request failed.";
    throw new Error(message || "The request failed.");
  }
  return data;
}

const EMPTY_SUMMARY = {
  total_sales: 0,
  total_cost: 0,
  total_profit: 0,
  total_quantity: 0,
  profit_margin: 0,
  sales_count: 0,
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function SalesandProfits({
  movementsLoading,
  movementsError,
  onRefreshMovements,
}) {
  const [dateFilter, setDateFilter] = useState("7days");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [breakdown, setBreakdown] = useState([]);
  const [rangeInfo, setRangeInfo] = useState({
    range: "7days",
    start_date: null,
    end_date: null,
  });
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("profit");
  const [sortDirection, setSortDirection] = useState("desc");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API}/dashboard/sales-profits/?range=${dateFilter}`,
      );
      const data = await readResponse(response);
      setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      setBreakdown(Array.isArray(data.breakdown) ? data.breakdown : []);
      setRangeInfo({
        range: data.range || dateFilter,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      });
    } catch (err) {
      setError(err.message);
      setSummary(EMPTY_SUMMARY);
      setBreakdown([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadData(), onRefreshMovements?.()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, onRefreshMovements]);

  const filteredBreakdown = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = breakdown.filter((row) => {
      if (!query) return true;
      return [row.product, row.sku, row.unit]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    const getValue = (row) => {
      switch (sortBy) {
        case "name":
          return String(row.product || "").toLowerCase();
        case "quantity":
          return toNumber(row.quantity);
        case "sales":
          return toNumber(row.sales);
        case "cost":
          return toNumber(row.cost);
        case "margin":
          return toNumber(row.profit_margin);
        case "profit":
        default:
          return toNumber(row.profit);
      }
    };

    rows.sort((a, b) => {
      const valueA = getValue(a);
      const valueB = getValue(b);
      if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
      if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [breakdown, search, sortBy, sortDirection]);

  const toggleSort = useCallback((column) => {
    setSortBy((current) => {
      if (current === column) {
        setSortDirection((direction) =>
          direction === "asc" ? "desc" : "asc",
        );
        return current;
      }
      setSortDirection("desc");
      return column;
    });
  }, []);

  const periodLabel =
    dateFilter === "30days"
      ? "Last 30 days"
      : dateFilter === "90days"
        ? "Last 90 days"
        : dateFilter === "all"
          ? "All time"
          : "Last 7 days";

  const totalSales = toNumber(summary.total_sales);
  const totalCost = toNumber(summary.total_cost);
  const totalProfit = toNumber(summary.total_profit);
  const profitMargin = toNumber(summary.profit_margin);

  return (
    <div className="sales-profits-page">
      <header className="sp-header">
        <div>
          <p className="sp-eyebrow">BUSINESS PERFORMANCE</p>
          <h1>Sales &amp; Profits</h1>
          <p className="sp-subtitle">
            Track revenue, cost of goods sold, and gross profit for {periodLabel.toLowerCase()}.
          </p>
        </div>

        <div className="sp-header-actions">
          <div className="sp-period">
            <label htmlFor="sp-range-select">Period:</label>
            <select
              id="sp-range-select"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          <button
            type="button"
            className="sp-refresh"
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {loading && <div className="sp-state">Loading sales &amp; profits...</div>}
      {error && <div className="sp-error">{error}</div>}
      {movementsError && !error && (
        <div className="sp-error">
          Stock movement refresh failed: {movementsError}
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="sp-summary">
            <div className="sp-card">
              <span>Total Sales</span>
              <strong>{money(totalSales)}</strong>
              <small>Revenue from recorded sales</small>
            </div>
            <div className="sp-card">
              <span>Cost of Goods Sold</span>
              <strong>{money(totalCost)}</strong>
              <small>Based on current purchase prices</small>
            </div>
            <div className={`sp-card ${totalProfit >= 0 ? "profit" : "loss"}`}>
              <span>Gross Profit</span>
              <strong>{money(totalProfit)}</strong>
              <small>{money(totalSales)} - {money(totalCost)}</small>
            </div>
            <div className="sp-card">
              <span>Profit Margin</span>
              <strong>{number(profitMargin)}%</strong>
              <small>Gross profit / total sales</small>
            </div>
            <div className="sp-card">
              <span>Quantity Sold</span>
              <strong>{number(summary.total_quantity)}</strong>
              <small>Units sold in period</small>
            </div>
            <div className="sp-card">
              <span>Sale Entries</span>
              <strong>{number(summary.sales_count)}</strong>
              <small>Recorded stock movements</small>
            </div>
          </section>

          <section className="sp-panel">
            <div className="sp-panel-heading">
              <div>
                <h2>Profit by Product</h2>
                <p>
                  {filteredBreakdown.length} product
                  {filteredBreakdown.length === 1 ? "" : "s"} with sales in this period
                  {rangeInfo.start_date && rangeInfo.end_date
                    ? ` (${rangeInfo.start_date} to ${rangeInfo.end_date})`
                    : ""}
                </p>
              </div>

              <input
                type="search"
                className="sp-search"
                placeholder="Search product or SKU..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {filteredBreakdown.length === 0 ? (
              <div className="sp-empty">
                No sales found for this period. Record sales in the Sales tab to see profit here.
              </div>
            ) : (
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th onClick={() => toggleSort("name")}>Product</th>
                      <th>SKU</th>
                      <th>Unit</th>
                      <th onClick={() => toggleSort("quantity")}>Qty Sold</th>
                      <th onClick={() => toggleSort("sales")}>Sales</th>
                      <th onClick={() => toggleSort("cost")}>Cost</th>
                      <th onClick={() => toggleSort("profit")}>Profit</th>
                      <th onClick={() => toggleSort("margin")}>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBreakdown.map((row) => {
                      const profit = toNumber(row.profit);
                      return (
                        <tr key={row.product_id || row.product}>
                          <td>
                            <strong>{row.product || "Product"}</strong>
                          </td>
                          <td>{row.sku || "—"}</td>
                          <td>{row.unit || "—"}</td>
                          <td>{number(row.quantity)}</td>
                          <td>{money(row.sales)}</td>
                          <td>{money(row.cost)}</td>
                          <td className={profit >= 0 ? "sp-profit" : "sp-loss"}>
                            {money(profit)}
                          </td>
                          <td>{number(row.profit_margin)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3">
                        <strong>Total</strong>
                      </td>
                      <td>
                        <strong>{number(summary.total_quantity)}</strong>
                      </td>
                      <td>
                        <strong>{money(totalSales)}</strong>
                      </td>
                      <td>
                        <strong>{money(totalCost)}</strong>
                      </td>
                      <td className={totalProfit >= 0 ? "sp-profit" : "sp-loss"}>
                        <strong>{money(totalProfit)}</strong>
                      </td>
                      <td>
                        <strong>{number(profitMargin)}%</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <p className="sp-note">
              Sales and profit are estimated from stock movements. Sale amounts use
              the product&apos;s current selling price and costs use its current
              purchase price; historical prices are not yet stored with stock
              movements.
            </p>
          </section>
        </>
      )}

      {!loading && !error && movementsLoading && breakdown.length === 0 && (
        <div className="sp-state">Refreshing stock movements...</div>
      )}
    </div>
  );
}
