import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://192.168.1.18:8000";

type Vendor = {
  id: string;
  name: string;
};

type Ingredient = {
  id: string;
  name: string;
  unit: string;
};

type PurchaseRow = {
  ingredient: string;
  quantity: string;
  unit_price: string;
};

const NEW_INGREDIENT_VALUE = "__add_new__";
const UNIT_OPTIONS = [
  "pcs",
  "kg",
  "g",
  "mg",
  "L",
  "ml",
  "dozen",
  "pack",
  "box",
  "bag",
  "bottle",
  "can",
  "tin",
  "tray",
  "sachet",
  "roll",
  "loaf",
  "bunch",
  "jar",
  "cup",
  "tbsp",
  "tsp",
  "slice",
  "set",
  "unit",
  "other",
] as const;

const emptyRow = (): PurchaseRow => ({
  ingredient: "",
  quantity: "",
  unit_price: "",
});

const toNonNegativeNumber = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

export default function StaffPurchaseEntry() {
  const token = localStorage.getItem("access");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [rows, setRows] = useState<PurchaseRow[]>([emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [addIngredientRowIndex, setAddIngredientRowIndex] = useState<number | null>(null);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientUnit, setNewIngredientUnit] = useState<string>("pcs");
  const [newIngredientCustomUnit, setNewIngredientCustomUnit] = useState("");
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadMasterData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [vendorRes, ingredientRes] = await Promise.all([
          fetch(`${API_BASE}/api/inventory/vendors/`, { headers }),
          fetch(`${API_BASE}/api/inventory/ingredients/`, { headers }),
        ]);
        if (!vendorRes.ok || !ingredientRes.ok) throw new Error("Failed to load master data");
        const vendorData = await vendorRes.json();
        const ingredientData = await ingredientRes.json();

        setVendors(
          (Array.isArray(vendorData) ? vendorData : []).map((row) => ({
            id: String(row.id),
            name: String(row.name ?? "Unknown"),
          })),
        );
        setIngredients(
          (Array.isArray(ingredientData) ? ingredientData : []).map((row) => ({
            id: String(row.id),
            name: String(row.name ?? "Unknown"),
            unit: String(row.unit ?? "-"),
          })),
        );
      } catch {
        setError("Unable to load vendors or ingredients.");
      } finally {
        setLoading(false);
      }
    };
    loadMasterData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showConfirmModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (!saving) void submitPurchase();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (!saving) setShowConfirmModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showConfirmModal, saving]); // eslint-disable-line react-hooks/exhaustive-deps

  const ingredientUnitMap = useMemo(
    () => Object.fromEntries(ingredients.map((ing) => [ing.id, ing.unit])),
    [ingredients],
  );
  const totalCost = useMemo(
    () =>
      rows.reduce(
        (sum, row) => sum + toNonNegativeNumber(row.quantity) * toNonNegativeNumber(row.unit_price),
        0,
      ),
    [rows],
  );
  const hasInvalidRow = useMemo(
    () =>
      rows.some(
        (r) =>
          !r.ingredient.trim() ||
          !r.quantity.trim() ||
          !r.unit_price.trim() ||
          toNonNegativeNumber(r.quantity) <= 0 ||
          toNonNegativeNumber(r.unit_price) < 0
      ),
    [rows]
  );
  const canSavePurchase = invoiceNo.trim().length > 0 && rows.length > 0 && !hasInvalidRow && !saving && !loading;

  const updateRow = (index: number, key: keyof PurchaseRow, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return { ...row, [key]: value };
      }),
    );
  };

  const openAddIngredientModal = (rowIndex: number) => {
    setAddIngredientRowIndex(rowIndex);
    setNewIngredientName("");
    setNewIngredientUnit("pcs");
    setNewIngredientCustomUnit("");
    setShowAddIngredientModal(true);
  };

  const saveNewIngredient = async () => {
    const name = newIngredientName.trim();
    const unit =
      newIngredientUnit === "other" ? newIngredientCustomUnit.trim() : newIngredientUnit.trim();

    if (!name) {
      setError("Ingredient name is required.");
      setMessage(null);
      return;
    }
    if (!unit) {
      setError("Unit is required.");
      setMessage(null);
      return;
    }

    setAddingIngredient(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/inventory/ingredients/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          name,
          unit,
          current_stock: 0,
          min_stock: 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail =
          (data as { detail?: string; error?: string })?.detail ||
          (data as { detail?: string; error?: string })?.error ||
          "Failed to add ingredient.";
        throw new Error(String(detail));
      }

      const created: Ingredient = {
        id: String((data as { id?: string }).id ?? ""),
        name: String((data as { name?: string }).name ?? name).toUpperCase(),
        unit: String((data as { unit?: string }).unit ?? unit),
      };
      if (!created.id) {
        throw new Error("Ingredient created but id missing.");
      }

      setIngredients((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );

      if (addIngredientRowIndex !== null) {
        updateRow(addIngredientRowIndex, "ingredient", created.id);
      }

      setShowAddIngredientModal(false);
      setMessage(`Ingredient ${created.name} added.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add ingredient.");
    } finally {
      setAddingIngredient(false);
    }
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (index: number) =>
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const submitPurchase = async () => {
    const trimmedInvoice = invoiceNo.trim();
    const validRows = rows.filter(
      (r) => r.ingredient.trim() && r.quantity.trim() && r.unit_price.trim(),
    );

    if (!trimmedInvoice) {
      setError("Invoice number is required.");
      setMessage(null);
      return;
    }
    if (!validRows.length) {
      setError("Add at least one valid purchase row.");
      setMessage(null);
      return;
    }
    if (hasInvalidRow) {
      setError("Please complete all rows with valid values before saving.");
      setMessage(null);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        vendor: vendorId || null,
        invoice_number: trimmedInvoice,
        items: validRows.map((r) => ({
          ingredient: r.ingredient,
          quantity: r.quantity,
          unit_price: r.unit_price,
        })),
      };

      const res = await fetch(`${API_BASE}/api/inventory/purchase-invoices/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error ?? "Failed to save purchase entry"));

      setMessage("Purchase entry saved and stock updated.");
      setInvoiceNo("");
      setVendorId("");
      setRows([emptyRow()]);
      setShowConfirmModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save purchase entry.");
    } finally {
      setSaving(false);
    }
  };

  const requestSubmitPurchase = () => {
    const trimmedInvoice = invoiceNo.trim();
    const validRows = rows.filter(
      (r) => r.ingredient.trim() && r.quantity.trim() && r.unit_price.trim(),
    );
    if (!trimmedInvoice) {
      setError("Invoice number is required.");
      setMessage(null);
      return;
    }
    if (!validRows.length) {
      setError("Add at least one valid purchase row.");
      setMessage(null);
      return;
    }
    if (hasInvalidRow) {
      setError("Please complete all rows with valid values before saving.");
      setMessage(null);
      return;
    }
    setShowConfirmModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-200/80 bg-[linear-gradient(140deg,#ffffff_0%,#f8f5ff_55%,#f3efff_100%)] p-6 shadow-[0_14px_36px_rgba(76,29,149,0.12)]">
        <h1 className="text-2xl font-bold text-violet-950">Purchase Entry</h1>
        <p className="mt-1 text-sm text-violet-700/80">
          Enter daily purchases. Stock will be increased automatically after save.
        </p>
      </div>

      <div className="rounded-2xl border border-violet-200/80 bg-white p-5 shadow-[0_10px_24px_rgba(76,29,149,0.08)]">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Supplier</label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="h-10 w-full rounded-xl border border-violet-200 bg-violet-50/40 px-3 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              <option value="">Select Supplier (Optional)</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Invoice No</label>
            <input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="INV-001"
              className="h-10 w-full rounded-xl border border-violet-200 bg-violet-50/40 px-3 text-sm text-violet-950 placeholder:text-violet-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={requestSubmitPurchase}
              disabled={!canSavePurchase}
              className="h-10 w-full rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(109,40,217,0.28)] transition hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Purchase"}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-[0_12px_26px_rgba(76,29,149,0.08)]">
        <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50/70 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-violet-800">Purchase Items</h2>
          <button
            onClick={addRow}
            className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
          >
            Add Row
          </button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-violet-50/60">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.1em] text-violet-700">Ingredient</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.1em] text-violet-700">Unit</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.1em] text-violet-700">Quantity</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.1em] text-violet-700">Unit Cost</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.1em] text-violet-700">Total Cost</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.1em] text-violet-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-violet-100">
                  <td className="px-3 py-2 text-sm">
                    <select
                      value={row.ingredient}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === NEW_INGREDIENT_VALUE) {
                          openAddIngredientModal(index);
                          return;
                        }
                        updateRow(index, "ingredient", value);
                      }}
                      className="h-9 w-full rounded-lg border border-violet-200 bg-violet-50/40 px-2 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="">Select Ingredient</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name}
                        </option>
                      ))}
                      <option value={NEW_INGREDIENT_VALUE}>+ Add New Ingredient</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-violet-900">{row.ingredient ? ingredientUnitMap[row.ingredient] : "-"}</td>
                  <td className="px-3 py-2 text-sm">
                    <input
                      value={row.quantity}
                      onChange={(e) => updateRow(index, "quantity", e.target.value)}
                      type="number"
                      placeholder="0"
                      className="h-9 w-28 rounded-lg border border-violet-200 bg-violet-50/40 px-2 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    />
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <input
                      value={row.unit_price}
                      onChange={(e) => updateRow(index, "unit_price", e.target.value)}
                      type="number"
                      placeholder="0.00"
                      className="h-9 w-28 rounded-lg border border-violet-200 bg-violet-50/40 px-2 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-violet-900">
                    Rs {(toNonNegativeNumber(row.quantity) * toNonNegativeNumber(row.unit_price)).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <button
                      onClick={() => removeRow(index)}
                      disabled={rows.length <= 1}
                      className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-violet-200 bg-violet-50/50">
                <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold text-violet-800">
                  Grand Total
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold text-violet-950">
                  Rs {totalCost.toFixed(2)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-violet-200 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">Confirm Purchase</p>
            <h3 className="mt-1 text-lg font-bold text-violet-950">Save Purchase Entry?</h3>
            <p className="mt-2 text-sm text-violet-700/80">
              This will update inventory stock based on the entered purchase items.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
                className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitPurchase()}
                disabled={saving}
                className="rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Yes, Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddIngredientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-violet-200 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">Add Ingredient</p>
            <h3 className="mt-1 text-lg font-bold text-violet-950">Create New Ingredient</h3>
            <p className="mt-2 text-sm text-violet-700/80">
              Add an ingredient and select its unit type. It will be available in the dropdown.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Ingredient Name</label>
                <input
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  placeholder="Ex: MAYONNAISE"
                  className="h-10 w-full rounded-xl border border-violet-200 bg-violet-50/40 px-3 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Unit Type</label>
                <select
                  value={newIngredientUnit}
                  onChange={(e) => setNewIngredientUnit(e.target.value)}
                  className="h-10 w-full rounded-xl border border-violet-200 bg-violet-50/40 px-3 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                >
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              {newIngredientUnit === "other" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Custom Unit</label>
                  <input
                    value={newIngredientCustomUnit}
                    onChange={(e) => setNewIngredientCustomUnit(e.target.value)}
                    placeholder="Ex: BUNDLE"
                    className="h-10 w-full rounded-xl border border-violet-200 bg-violet-50/40 px-3 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddIngredientModal(false)}
                disabled={addingIngredient}
                className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveNewIngredient()}
                disabled={addingIngredient}
                className="rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {addingIngredient ? "Saving..." : "Save Ingredient"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


