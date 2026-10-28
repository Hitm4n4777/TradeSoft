import { useMemo, useState } from "react";
import "./Sales.css";

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const quantity = (value) =>
  Number(Math.abs(value || 0)).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });

const datePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Karachi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getSaleDateKey(dateValue) {
  if (!dateValue) return "unknown-date";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "unknown-date";

  return datePartsFormatter.format(date);
}

function formatSaleDate(dateKey) {
  if (dateKey === "unknown-date") return "Date unavailable";

  const date = new Date(`${dateKey}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatSaleTime(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function Sales({
  movements,
  movementsLoading,
  movementsError,
  onRefreshMovements,
}) {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const saleMovements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return movements.filter((movement) => {
      if (movement.movement_type !== "sale" || Number(movement.quantity) >= 0) {
        return false;
      }

      const dateKey = getSaleDateKey(movement.created_at);
      if (startDate && dateKey < startDate) return false;
      if (endDate && dateKey > endDate) return false;

      const searchableText = [
        movement.product_name,
        movement.product_sku,
        movement.reference,
        movement.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !query || searchableText.includes(query);
    });
  }, [endDate, movements, search, startDate]);

  const groupedSales = useMemo(() => {
    const groups = new Map();

    for (const movement of saleMovements) {
      const dateKey = getSaleDateKey(movement.created_at);
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey).push(movement);
    }

    return [...groups.entries()].sort(([dateA], [dateB]) =>
      dateB.localeCompare(dateA),
    );
  }, [saleMovements]);

  const totalSales = saleMovements.reduce(
    (total, movement) =>
      total +
      Math.abs(Number(movement.quantity || 0)) *
        Number(movement.product_selling_price || 0),
    0,
  );

  function clearFilters() {
    setSearch("");
    setStartDate("");
    setEndDate("");
  }

  return (
    <div className="sales-page">
      <header className="sales-page-header">
        <div>
          <p className="sales-eyebrow">BUSINESS ACTIVITY</p>
          <h1>Sales</h1>
          <p className="sales-subtitle">
            Browse recorded sales grouped by day, and narrow them by date or
            product.
          </p>
        </div>
        <button
          className="sales-refresh"
          onClick={onRefreshMovements}
          disabled={movementsLoading}
        >
          ↻ {movementsLoading ? "Refreshing..." : "Refresh sales"}
        </button>
      </header>

      {movementsError && (
        <div className="sales-message" role="alert">
          Could not refresh sales: {movementsError}
        </div>
      )}

      <section className="sales-summary" aria-label="Sales summary">
        <article className="sales-summary-card">
          <span>Sales in filtered results</span>
          <strong>{money(totalSales)}</strong>
          <small>Estimated using current product prices</small>
        </article>
        <article className="sales-summary-card">
          <span>Sale entries</span>
          <strong>{saleMovements.length}</strong>
          <small>Recorded stock-out movements</small>
        </article>
        <article className="sales-summary-card">
          <span>Days with sales</span>
          <strong>{groupedSales.length}</strong>
          <small>Based on the selected filters</small>
        </article>
      </section>

      <section className="sales-panel">
        <div className="sales-panel-heading">
          <div>
            <h2>Sales history</h2>
            <p>
              Each day's sales are kept together with a daily estimated total.
            </p>
          </div>
        </div>

        <div className="sales-filters">
          <label className="sales-search">
            <span>Search sales</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Product, SKU, reference, or notes"
            />
          </label>
          <label>
            <span>From</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <button className="sales-clear-filters" onClick={clearFilters}>
            Clear filters
          </button>
        </div>

        {movementsLoading && movements.length === 0 ? (
          <div className="sales-empty-state">Loading sales history...</div>
        ) : groupedSales.length === 0 ? (
          <div className="sales-empty-state">
            {movementsError && movements.length === 0
              ? "Sales could not be loaded. Refresh and try again."
              : "No sales match these filters."}
          </div>
        ) : (
          <div className="sales-days">
            {groupedSales.map(([dateKey, daySales]) => {
              const dayTotal = daySales.reduce(
                (total, movement) =>
                  total +
                  Math.abs(Number(movement.quantity || 0)) *
                    Number(movement.product_selling_price || 0),
                0,
              );

              return (
                <section className="sales-day" key={dateKey}>
                  <header className="sales-day-header">
                    <div>
                      <h3>{formatSaleDate(dateKey)}</h3>
                      <span>
                        {daySales.length}{" "}
                        {daySales.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                    <div className="sales-day-total">
                      <small>Estimated day total</small>
                      <strong>{money(dayTotal)}</strong>
                    </div>
                  </header>

                  <div className="sales-table-wrap">
                    <table className="sales-table">
                      <thead>
                        <tr>
                          <th>TIME</th>
                          <th>PRODUCT</th>
                          <th>REFERENCE / NOTES</th>
                          <th>QUANTITY</th>
                          <th>EST. AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daySales.map((movement) => {
                          const amount =
                            Math.abs(Number(movement.quantity || 0)) *
                            Number(movement.product_selling_price || 0);

                          return (
                            <tr key={movement.id}>
                              <td>{formatSaleTime(movement.created_at)}</td>
                              <td>
                                <strong>
                                  {movement.product_name || "Product"}
                                </strong>
                                <small>{movement.product_sku || ""}</small>
                              </td>
                              <td>
                                <strong>{movement.reference || "—"}</strong>
                                {movement.notes && (
                                  <small>{movement.notes}</small>
                                )}
                              </td>
                              <td>{quantity(movement.quantity)}</td>
                              <td className="sales-amount">{money(amount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}
        <footer className="sales-results-footer">
          Showing {saleMovements.length} sale{" "}
          {saleMovements.length === 1 ? "entry" : "entries"}
          {movementsLoading ? " · Refreshing..." : ""}
        </footer>
      </section>

      <p className="sales-estimate-note">
        Sale amounts are estimates based on the product's current selling price;
        historical prices are not yet stored with stock movements.
      </p>
    </div>
  );
}
