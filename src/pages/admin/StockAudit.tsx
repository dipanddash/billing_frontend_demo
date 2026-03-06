import { useEffect, useMemo, useState } from "react";

const API_BASE = "https://demo-j5fde.ondigitalocean.app";

type AuditRow = {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  previous_manual_closing: string | number;
  purchase_qty: string | number;
  sold_qty: string | number;
  start_stock: string | number;
  system_closing: string | number;
  manual_closing: string | number | null;
  difference: string | number | null;
  entered_by: string;
  entered_at: string | null;
  has_mismatch: boolean;
};

export default function StockAudit() {
  const token = localStorage.getItem("access");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/inventory/stock-audit/?date=${encodeURIComponent(date)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(payload?.error ?? payload?.detail ?? "Failed to load stock audit"));
      setRows(Array.isArray(payload?.rows) ? payload.rows : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load stock audit.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => {
    const mismatch = rows.filter((r) => r.has_mismatch).length;
    return { total: rows.length, mismatch };
  }, [rows]);

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute -left-20 top-8 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-20 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(130deg,#ffffff_0%,#f8f7ff_45%,#f4f2ff_100%)] p-7 shadow-[0_20px_55px_rgba(76,29,149,0.1)]">
        <h1 className="text-2xl font-semibold text-slate-900">Stock Difference Audit</h1>
        <p className="mt-1 text-sm text-slate-600">
          Admin-only comparison of system closing vs staff manual closing with daily difference.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-violet-200/70 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-500">Audit Date</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 h-10 rounded-xl border border-violet-200 px-3 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-300/40"
          />
        </div>
        <div className="rounded-2xl border border-violet-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-500">Ingredients</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-[0_10px_24px_rgba(244,63,94,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-600">Mismatches</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{summary.mismatch}</p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-600">Loading audit...</p> : null}

      <div className="overflow-hidden rounded-2xl border border-violet-200/70 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
        <div className="overflow-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-violet-50">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Ingredient</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Opening Stock</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Purchase Stock</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Total Stock</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Consumption</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase">System Closing Stock</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Manual Closing Stock</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Difference</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Staff</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ingredient_id} className={`border-t border-violet-100 ${row.has_mismatch ? "bg-red-50/50" : "hover:bg-violet-50/40"}`}>
                  <td className="px-3 py-2 text-sm">{row.ingredient_name} ({row.unit})</td>
                  <td className="px-3 py-2 text-sm">{String(row.previous_manual_closing)}</td>
                  <td className="px-3 py-2 text-sm">{String(row.purchase_qty)}</td>
                  <td className="px-3 py-2 text-sm">{String(row.start_stock)}</td>
                  <td className="px-3 py-2 text-sm">{String(row.sold_qty)}</td>
                  <td className="px-3 py-2 text-sm">{String(row.system_closing)}</td>
                  <td className="px-3 py-2 text-sm">{row.manual_closing === null ? "-" : String(row.manual_closing)}</td>
                  <td className={`px-3 py-2 text-sm ${row.has_mismatch ? "font-semibold text-red-600" : ""}`}>
                    {row.difference === null ? "-" : String(row.difference)}
                  </td>
                  <td className="px-3 py-2 text-sm">{row.entered_by || "-"}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-sm text-slate-500" colSpan={9}>No audit rows found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



