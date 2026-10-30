import { useCallback, useEffect, useState } from "react";
import "./Inventory.css";

// TradeSoft backend API address.
const API = "http://127.0.0.1:8000/api";

// Format quantities and prices consistently.
const number = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Convert API errors into readable messages.
async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object"
        ? Object.entries(data)
            .map(
              ([key, value]) =>
                `${key}: ${Array.isArray(value) ? value.join(", ") : value}`,
            )
            .join("\n")
        : "The request failed.";

    throw new Error(message || "The request failed.");
  }

  return data;
}

export default function Inventory({
  movements,
  movementsLoading,
  movementsError,
  onRefreshMovements,
}) {
  // Data loaded from the existing TradeSoft backend.
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);

  // Screen state.
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [productSaving, setProductSaving] = useState(false);
  const [removingProductId, setRemovingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    category: "",
    unit: "bag",
    purchase_price: "",
    selling_price: "",
    minimum_stock: "",
    initial_stock: "",
  });

  // Stock entry form state.
  const [productId, setProductId] = useState("");
  const [movementType, setMovementType] = useState("purchase");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // Load products, current stock, and stock history.
  const loadInventory = useCallback(async () => {
    try {
      setError("");

      const [productData, stockData] = await Promise.all([
        fetch(`${API}/products/`).then(readResponse),
        fetch(`${API}/stock-movements/stock/`).then(readResponse),
      ]);

      setProducts(
        Array.isArray(productData) ? productData : productData.results || [],
      );
      setStock(Array.isArray(stockData) ? stockData : []);
    } catch (err) {
      setError(`Unable to load inventory: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  async function refreshInventory() {
    await Promise.all([loadInventory(), onRefreshMovements()]);
  }

  async function handleAddProduct(event) {
    event.preventDefault();
    if (productSaving) return;

    const initialStock = Number(productForm.initial_stock || 0);
    if (!Number.isFinite(initialStock) || initialStock < 0) {
      setError("Initial stock must be zero or greater.");
      return;
    }

    let createdProduct = null;
    try {
      setProductSaving(true);
      setError("");
      setSuccess("");

      createdProduct = await readResponse(
        await fetch(`${API}/products/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: productForm.name.trim(),
            sku: productForm.sku.trim(),
            category: productForm.category.trim(),
            unit: productForm.unit,
            purchase_price: productForm.purchase_price || "0",
            selling_price: productForm.selling_price || "0",
            minimum_stock: productForm.minimum_stock || "0",
          }),
        }),
      );

      if (initialStock > 0) {
        await readResponse(
          await fetch(`${API}/stock-movements/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product: createdProduct.id,
              quantity: initialStock,
              movement_type: "opening",
              reference: "Initial stock",
              notes: "Opening quantity entered when the product was created.",
            }),
          }),
        );
      }

      setProductForm({
        name: "",
        sku: "",
        category: "",
        unit: "bag",
        purchase_price: "",
        selling_price: "",
        minimum_stock: "",
        initial_stock: "",
      });
      setSuccess(
        initialStock > 0
          ? `Product added with ${number(initialStock)} ${createdProduct.unit} in stock.`
          : "Product added successfully.",
      );
      await Promise.all([loadInventory(), onRefreshMovements()]);
    } catch (err) {
      if (createdProduct) {
        setProductForm({
          name: "",
          sku: "",
          category: "",
          unit: "bag",
          purchase_price: "",
          selling_price: "",
          minimum_stock: "",
          initial_stock: "",
        });
        setError(
          `Product was created, but its initial stock could not be recorded: ${err.message} Use “Record stock movement” to add the stock.`,
        );
        await Promise.all([loadInventory(), onRefreshMovements()]);
      } else {
        setError(err.message);
      }
    } finally {
      setProductSaving(false);
    }
  }

  async function handleRemoveProduct(product) {
    const confirmed = window.confirm(
      `Remove ${product.name} (${product.sku}) from active products? Its stock and transaction history will be preserved.`,
    );
    if (!confirmed || removingProductId !== null) return;

    try {
      setRemovingProductId(product.id);
      setError("");
      setSuccess("");

      await readResponse(
        await fetch(`${API}/products/${product.id}/`, { method: "DELETE" }),
      );

      if (String(productId) === String(product.id)) setProductId("");
      setSuccess(`${product.name} was removed from active products.`);
      await loadInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingProductId(null);
    }
  }

  // Load inventory when the screen opens.
  useEffect(() => {
    console.log("Loading inventory...");
    loadInventory();
  }, [loadInventory]);

  // Keep the selected product valid when product data loads.
  useEffect(() => {
    if (!productId && products.length) {
      setProductId(String(products[0].id));
    }
  }, [products, productId]);

  // Find products matching the search and selected filter.
  const filteredStock = stock.filter((item) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      item.name?.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query);

    const matchesFilter =
      filter === "all" ||
      (filter === "low" && item.low_stock) ||
      (filter === "out" && Number(item.current_stock) <= 0);

    return matchesSearch && matchesFilter;
  });

  // Summary figures based on current stock data.
  const lowStockCount = stock.filter((item) => item.low_stock).length;
  const outOfStockCount = stock.filter(
    (item) => Number(item.current_stock) <= 0,
  ).length;

  // Submit one stock movement to the existing API.
  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const amount = Number(quantity);

    if (!productId) {
      setError("Select a product first.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }

    // The user enters a normal positive quantity.
    // TradeSoft applies the correct sign for the movement.
    const signedQuantity =
      movementType === "sale" || (movementType === "adjustment" && amount < 0)
        ? -amount
        : amount;

    // Adjustment direction is handled separately below.
    const payload = {
      product: Number(productId),
      quantity:
        movementType === "adjustment"
          ? quantity.startsWith("-")
            ? -Math.abs(amount)
            : amount
          : movementType === "sale"
            ? -amount
            : signedQuantity,
      movement_type: movementType,
      reference: reference.trim(),
      notes: notes.trim(),
    };

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await readResponse(
        await fetch(`${API}/stock-movements/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      );

      setSuccess("Stock movement recorded successfully.");
      setQuantity("");
      setReference("");
      setNotes("");

      // Refresh stock and history after a successful entry only.
      await Promise.all([loadInventory(), onRefreshMovements()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="inventory-page">
      <header className="inventory-header">
        <div>
          <p className="inventory-eyebrow">INVENTORY MANAGEMENT</p>
          <h1>Inventory</h1>
          <p className="inventory-subtitle">
            Monitor stock levels and track every stock movement.
          </p>
        </div>

        <button
          className="inventory-refresh"
          onClick={refreshInventory}
          disabled={loading || saving}
        >
          ↻ Refresh
        </button>
      </header>

      {error && (
        <div className="inventory-message inventory-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="inventory-message inventory-success" role="status">
          {success}
        </div>
      )}

      <section className="inventory-stats">
        <article className="inventory-stat">
          <span>Active products</span>
          <strong>
            {products.filter((p) => p.is_active !== false).length}
          </strong>
          <small>Registered products</small>
        </article>

        <article className="inventory-stat">
          <span>Low stock</span>
          <strong>{lowStockCount}</strong>
          <small>At or below minimum level</small>
        </article>

        <article className="inventory-stat">
          <span>Out of stock</span>
          <strong>{outOfStockCount}</strong>
          <small>Zero or negative quantity</small>
        </article>

        <article className="inventory-stat">
          <span>Stock movements</span>
          <strong>{movements.length}</strong>
          <small>Recorded inventory changes</small>
        </article>
      </section>

      <section className="inventory-panel">
        <div className="inventory-panel-heading">
          <div>
            <h2>Add a product</h2>
            <p>
              Add a product to your catalog. New products start with no stock;
              record an opening stock movement below.
            </p>
          </div>
        </div>

        <form
          className="inventory-form product-form"
          onSubmit={handleAddProduct}
        >
          <label>
            Product name
            <input
              value={productForm.name}
              onChange={(event) =>
                setProductForm({ ...productForm, name: event.target.value })
              }
              placeholder="e.g. Layer Feed"
              required
            />
          </label>
          <label>
            SKU
            <input
              value={productForm.sku}
              onChange={(event) =>
                setProductForm({ ...productForm, sku: event.target.value })
              }
              placeholder="Unique product code"
              required
            />
          </label>
          <label>
            Category
            <input
              value={productForm.category}
              onChange={(event) =>
                setProductForm({ ...productForm, category: event.target.value })
              }
              placeholder="Optional"
            />
          </label>
          <label>
            Unit
            <input
              value={productForm.unit}
              onChange={(event) =>
                setProductForm({ ...productForm, unit: event.target.value })
              }
              placeholder="bag, kg, ton"
              required
            />
          </label>
          <label>
            Purchase price
            <input
              type="number"
              min="0"
              step="0.01"
              value={productForm.purchase_price}
              onChange={(event) =>
                setProductForm({
                  ...productForm,
                  purchase_price: event.target.value,
                })
              }
              placeholder="0.00"
            />
          </label>
          <label>
            Selling price
            <input
              type="number"
              min="0"
              step="0.01"
              value={productForm.selling_price}
              onChange={(event) =>
                setProductForm({
                  ...productForm,
                  selling_price: event.target.value,
                })
              }
              placeholder="0.00"
            />
          </label>
          <label>
            Minimum stock
            <input
              type="number"
              min="0"
              step="0.001"
              value={productForm.minimum_stock}
              onChange={(event) =>
                setProductForm({
                  ...productForm,
                  minimum_stock: event.target.value,
                })
              }
              placeholder="0"
            />
          </label>
          <label>
            Initial stock
            <input
              type="number"
              min="0"
              step="0.001"
              value={productForm.initial_stock}
              onChange={(event) =>
                setProductForm({
                  ...productForm,
                  initial_stock: event.target.value,
                })
              }
              placeholder="0"
            />
            <small>
              Enter the quantity currently on hand. Leave at 0 if none.
            </small>
          </label>
          <div className="inventory-form-actions">
            <button
              type="submit"
              className="inventory-submit"
              disabled={productSaving || loading}
            >
              {productSaving ? "Adding product..." : "＋ Add product"}
            </button>
          </div>
        </form>
      </section>

      <section className="inventory-panel">
        <div className="inventory-panel-heading">
          <div>
            <h2>Record stock movement</h2>
            <p>
              Record opening stock, purchases, sales, returns, or adjustments.
            </p>
          </div>
        </div>

        <form className="inventory-form" onSubmit={handleSubmit}>
          <label>
            Product
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              <option value="">Select product</option>
              {products
                .filter((product) => product.is_active !== false)
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
            </select>
          </label>

          <label>
            Movement type
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
            >
              <option value="purchase">Purchase — Stock in</option>
              <option value="opening">Opening stock</option>
              <option value="sale">Sale — Stock out</option>
              <option value="return">Return — Stock in</option>
              <option value="adjustment">Stock adjustment</option>
            </select>
          </label>

          <label>
            Quantity
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              required
            />
            <small>
              {movementType === "sale"
                ? "This quantity will be deducted from stock."
                : movementType === "adjustment"
                  ? "Enter a positive quantity to add stock. For a reduction, use the negative sign."
                  : "This quantity will be added to stock."}
            </small>
          </label>

          <label>
            Reference
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. invoice number"
            />
          </label>

          <label className="inventory-notes-field">
            Notes
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional details"
            />
          </label>

          <div className="inventory-form-actions">
            <button
              type="submit"
              className="inventory-submit"
              disabled={saving || loading || products.length === 0}
            >
              {saving ? "Saving..." : "Record movement"}
            </button>
          </div>
        </form>
      </section>

      <section className="inventory-panel">
        <div className="inventory-panel-heading">
          <div>
            <h2>Current stock</h2>
            <p>Live quantities calculated from recorded stock movements.</p>
          </div>
        </div>

        <div className="inventory-toolbar">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name or SKU..."
            aria-label="Search inventory"
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter inventory"
          >
            <option value="all">All products</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>

        {loading ? (
          <p className="inventory-empty">Loading inventory...</p>
        ) : (
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Available</th>
                  <th>Minimum</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item) => (
                  <tr key={item.product_id}>
                    <td className="inventory-product-name">{item.name}</td>
                    <td>{item.sku}</td>
                    <td>
                      <strong>{number(item.current_stock)}</strong> {item.unit}
                    </td>
                    <td>{number(item.minimum_stock)}</td>
                    <td>
                      <span
                        className={`inventory-status ${
                          Number(item.current_stock) <= 0
                            ? "status-out"
                            : item.low_stock
                              ? "status-low"
                              : "status-good"
                        }`}
                      >
                        {Number(item.current_stock) <= 0
                          ? "Out of stock"
                          : item.low_stock
                            ? "Low stock"
                            : "In stock"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="inventory-remove"
                        onClick={() =>
                          handleRemoveProduct(
                            products.find(
                              (product) => product.id === item.product_id,
                            ) || {
                              id: item.product_id,
                              name: item.name,
                              sku: item.sku,
                            },
                          )
                        }
                        disabled={removingProductId !== null}
                      >
                        {removingProductId === item.product_id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredStock.length === 0 && (
                  <tr>
                    <td colSpan="6" className="inventory-empty">
                      No matching inventory items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="inventory-panel">
        <div className="inventory-panel-heading">
          <div>
            <h2>Recent stock movements</h2>
            <p>Review the latest stock entries and deductions.</p>
          </div>
        </div>

        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 10).map((movement) => (
                <tr key={movement.id}>
                  <td>
                    {movement.created_at
                      ? new Date(movement.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="inventory-product-name">
                    {movement.product_name || `Product #${movement.product}`}
                  </td>
                  <td>{movement.movement_type?.replaceAll("_", " ") || "—"}</td>
                  <td>
                    <strong>{number(movement.quantity)}</strong>
                  </td>
                  <td>{movement.reference || "—"}</td>
                </tr>
              ))}

              {movementsLoading && movements.length === 0 && (
                <tr>
                  <td colSpan="5" className="inventory-empty">
                    Loading recent stock movements...
                  </td>
                </tr>
              )}

              {!movementsLoading &&
                movementsError &&
                movements.length === 0 && (
                  <tr>
                    <td colSpan="5" className="inventory-empty">
                      Unable to load stock movements: {movementsError}
                    </td>
                  </tr>
                )}

              {!movementsLoading &&
                !movementsError &&
                movements.length === 0 && (
                  <tr>
                    <td colSpan="5" className="inventory-empty">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
