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

const emptyRow = (): PurchaseRow => ({
  ingredient: "",
  quantity: "",
  unit_price: "",
});

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

  const ingredientUnitMap = useMemo(
    () => Object.fromEntries(ingredients.map((ing) => [ing.id, ing.unit])),
    [ingredients],
  );

  const updateRow = (index: number, key: keyof PurchaseRow, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return { ...row, [key]: value };
      }),
    );
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save purchase entry.");
    } finally {
      setSaving(false);
    }
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
              onClick={submitPurchase}
              disabled={saving || loading}
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
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.1em] text-violet-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-violet-100">
                  <td className="px-3 py-2 text-sm">
                    <select
                      value={row.ingredient}
                      onChange={(e) => updateRow(index, "ingredient", e.target.value)}
                      className="h-9 w-full rounded-lg border border-violet-200 bg-violet-50/40 px-2 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="">Select Ingredient</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name}
                        </option>
                      ))}
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
