import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = "http://192.168.1.18:8000";

type IngredientRow = {
  id: string;
  name: string;
  unit: string;
};

type ExistingRow = {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  physical_quantity: string | number;
  date: string;
  entered_at: string;
  entered_by: string;
};

export default function StaffManualClosing() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const token = localStorage.getItem("access");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [existingRows, setExistingRows] = useState<ExistingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    const loadIngredients = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/inventory/ingredients/`, { headers: authHeaders });
        if (!res.ok) throw new Error("Failed to load ingredients");
        const data = await res.json();
        const rows = (Array.isArray(data) ? data : []).map((row) => ({
          id: String(row.id),
          name: String(row.name ?? "-"),
          unit: String(row.unit ?? "-"),
        }));
        setIngredients(rows);
      } catch {
        setError("Unable to load ingredients.");
      }
    };
    loadIngredients();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadExisting = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/inventory/manual-closing/me/?date=${encodeURIComponent(date)}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load manual closings");
      const data = await res.json();
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      setExistingRows(rows);
      const next: Record<string, string> = {};
      rows.forEach((row: ExistingRow) => {
        next[String(row.ingredient_id)] = String(row.physical_quantity ?? "");
      });
      setQuantities(next);
    } catch {
      setError("Unable to load manual closing entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExisting();
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const rowsForSubmit = useMemo(
    () =>
      ingredients
        .filter((ing) => quantities[ing.id] !== undefined && quantities[ing.id] !== "")
        .map((ing) => ({ ingredient: ing.id, quantity: quantities[ing.id] })),
    [ingredients, quantities],
  );

  const saveManualClosing = async () => {
    if (!rowsForSubmit.length) {
      setError("Enter at least one ingredient quantity.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/inventory/manual-closing/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ date, items: rowsForSubmit }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error ?? "Failed to save manual closing"));
      setMessage("Manual closing saved. Logging out for end-of-day.");
      await loadExisting();
      if (token) {
        try {
          await fetch(`${API_BASE}/api/accounts/logout/`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // Best-effort API logout; local logout still enforced below.
        }
      }
      logout();
      window.setTimeout(() => navigate("/", { replace: true }), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save manual closing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute -left-20 top-6 h-64 w-64 rounded-full bg-violet-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-28 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-3xl border border-violet-200/70 bg-[linear-gradient(130deg,#ffffff_0%,#f8f5ff_48%,#f3efff_100%)] p-6 shadow-[0_20px_55px_rgba(91,33,182,0.14)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">Staff Closing Desk</p>
        <h1 className="mt-1 text-2xl font-bold text-violet-950">Manual Closing</h1>
        <p className="mt-1 text-sm text-violet-700/80">
          Staff view shows only manually entered physical stock. Audit difference is admin-only.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-violet-200 bg-white/90 px-3 py-1 text-xs font-medium text-violet-700">
            Date-wise capture
          </span>
          <span className="rounded-full border border-violet-200 bg-white/90 px-3 py-1 text-xs font-medium text-violet-700">
            Physical stock only
          </span>
          <span className="rounded-full border border-violet-200 bg-white/90 px-3 py-1 text-xs font-medium text-violet-700">
            Staff-safe mode
          </span>
        </div>
      </div>

      <div className="relative rounded-3xl border border-violet-200/70 bg-white p-5 shadow-[0_14px_34px_rgba(91,33,182,0.1)]">
        <div className="grid gap-4 md:grid-cols-[auto_minmax(220px,280px)_minmax(220px,300px)] md:items-end">
          <label className="text-sm font-semibold text-violet-800">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 rounded-xl border border-violet-200 bg-violet-50/40 px-3 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          />
          <button
            onClick={saveManualClosing}
            disabled={saving}
            className="h-11 rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,40,217,0.28)] transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Manual Closing"}
          </button>
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

      <div className="overflow-hidden rounded-3xl border border-violet-200/70 bg-white shadow-[0_14px_34px_rgba(91,33,182,0.1)]">
        <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50/70 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-800">Physical Closing Entry</h2>
          <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-700">
            {ingredients.length} ingredients
          </span>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-violet-700/80">Loading...</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-violet-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Ingredient</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Unit</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Physical Quantity</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => (
                  <tr key={ing.id} className="border-t border-violet-100 transition hover:bg-violet-50/35">
                    <td className="px-5 py-3 text-sm font-semibold text-violet-950">{ing.name}</td>
                    <td className="px-5 py-3 text-sm text-violet-800">{ing.unit}</td>
                    <td className="px-5 py-3 text-sm">
                      <input
                        value={quantities[ing.id] ?? ""}
                        onChange={(e) => setQuantities((prev) => ({ ...prev, [ing.id]: e.target.value }))}
                        placeholder="0"
                        className="h-10 w-36 rounded-xl border border-violet-200 bg-white px-3 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-violet-200/70 bg-white shadow-[0_14px_34px_rgba(91,33,182,0.1)]">
        <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50/70 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-800">Your Saved Entries ({date})</h2>
          <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-700">
            {existingRows.length} rows
          </span>
        </div>
        {existingRows.length === 0 ? (
          <p className="p-5 text-sm text-violet-700/80">No entries found for this date.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-violet-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Ingredient</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Quantity</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Entered At</th>
                </tr>
              </thead>
              <tbody>
                {existingRows.map((row) => (
                  <tr key={row.ingredient_id} className="border-t border-violet-100 transition hover:bg-violet-50/35">
                    <td className="px-5 py-3 text-sm font-semibold text-violet-950">{row.ingredient_name}</td>
                    <td className="px-5 py-3 text-sm text-violet-900">{String(row.physical_quantity)} {row.unit}</td>
                    <td className="px-5 py-3 text-sm text-violet-700/90">{new Date(row.entered_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
