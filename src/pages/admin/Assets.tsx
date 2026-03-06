import { useEffect, useMemo, useState } from "react";
import { Boxes, Plus, Pencil, Trash2, ClipboardList, ShieldAlert } from "lucide-react";

const API_BASE = "https://demo-j5fde.ondigitalocean.app";

interface AssetCategory {
  id: number;
  name: string;
}

interface AssetItem {
  id: string;
  name: string;
  category: number | null;
  category_name?: string;
  quantity: number;
  status: "WORKING" | "DAMAGED" | "REPAIR" | "LOST";
  purchase_date?: string | null;
  warranty_end?: string | null;
  remarks?: string | null;
}

interface AssetLogRow {
  id: number;
  asset: string;
  asset_name?: string;
  action: string;
  quantity_change: number;
  performed_by?: string | null;
  performed_by_username?: string;
  note?: string | null;
  created_at: string;
}

const parseRows = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  const obj = payload as { results?: unknown[]; data?: unknown[] };
  if (Array.isArray(obj?.results)) return obj.results as Record<string, unknown>[];
  if (Array.isArray(obj?.data)) return obj.data as Record<string, unknown>[];
  return [];
};

const toIsoDateInput = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const statusClasses: Record<AssetItem["status"], string> = {
  WORKING: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DAMAGED: "bg-rose-50 text-rose-700 border-rose-200",
  REPAIR: "bg-amber-50 text-amber-700 border-amber-200",
  LOST: "bg-slate-100 text-slate-700 border-slate-300",
};

const Assets = () => {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [logs, setLogs] = useState<AssetLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AssetItem["status"]>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const [categoryInput, setCategoryInput] = useState("");
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    quantity: "1",
    status: "WORKING" as AssetItem["status"],
    purchase_date: "",
    warranty_end: "",
    remarks: "",
  });

  const getAuthHeaders = (withJson = false) => {
    const token = localStorage.getItem("access");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const apiKey = localStorage.getItem("api_key") || import.meta.env.VITE_API_KEY;
    if (apiKey) headers["X-API-KEY"] = apiKey;
    if (withJson) headers["Content-Type"] = "application/json";
    return headers;
  };

  const loadCategories = async () => {
    const res = await fetch(`${API_BASE}/api/assets/categories/`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to load asset categories");
    const payload = await res.json();
    const rows = parseRows(payload);
    setCategories(
      rows.map((row) => ({
        id: Number(row.id),
        name: String(row.name ?? ""),
      })),
    );
  };

  const loadAssets = async () => {
    const res = await fetch(`${API_BASE}/api/assets/`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to load assets");
    const payload = await res.json();
    const rows = parseRows(payload);
    setAssets(
      rows.map((row) => ({
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        category: row.category === null || row.category === undefined ? null : Number(row.category),
        category_name: row.category_name ? String(row.category_name) : undefined,
        quantity: Number(row.quantity ?? 0),
        status: String(row.status ?? "WORKING").toUpperCase() as AssetItem["status"],
        purchase_date: row.purchase_date ? String(row.purchase_date) : null,
        warranty_end: row.warranty_end ? String(row.warranty_end) : null,
        remarks: row.remarks ? String(row.remarks) : null,
      })),
    );
  };

  const loadLogs = async () => {
    const res = await fetch(`${API_BASE}/api/assets/logs/`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to load asset logs");
    const payload = await res.json();
    const rows = parseRows(payload);
    setLogs(
      rows.map((row) => ({
        id: Number(row.id),
        asset: String(row.asset ?? ""),
        asset_name: row.asset_name ? String(row.asset_name) : undefined,
        action: String(row.action ?? ""),
        quantity_change: Number(row.quantity_change ?? 0),
        performed_by: row.performed_by === null || row.performed_by === undefined ? null : String(row.performed_by),
        performed_by_username: row.performed_by_username ? String(row.performed_by_username) : undefined,
        note: row.note === null || row.note === undefined ? null : String(row.note),
        created_at: String(row.created_at ?? ""),
      })),
    );
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadCategories(), loadAssets(), loadLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const openCreateModal = () => {
    setEditingAsset(null);
    setForm({
      name: "",
      category: "",
      quantity: "1",
      status: "WORKING",
      purchase_date: "",
      warranty_end: "",
      remarks: "",
    });
    setShowAssetModal(true);
  };

  const openEditModal = (asset: AssetItem) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name,
      category: asset.category === null ? "" : String(asset.category),
      quantity: String(asset.quantity),
      status: asset.status,
      purchase_date: toIsoDateInput(asset.purchase_date),
      warranty_end: toIsoDateInput(asset.warranty_end),
      remarks: asset.remarks ?? "",
    });
    setShowAssetModal(true);
  };

  const saveAsset = async () => {
    if (!form.name.trim()) {
      setError("Asset name is required.");
      return;
    }

    const qty = Number(form.quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      setError("Quantity must be a valid non-negative number.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category ? Number(form.category) : null,
        quantity: qty,
        status: form.status,
        purchase_date: form.purchase_date || null,
        warranty_end: form.warranty_end || null,
        remarks: form.remarks.trim() || null,
      };

      const isEdit = Boolean(editingAsset);
      const url = isEdit ? `${API_BASE}/api/assets/${editingAsset?.id}/` : `${API_BASE}/api/assets/`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(isEdit ? "Failed to update asset" : "Failed to create asset");

      setShowAssetModal(false);
      setEditingAsset(null);
      await Promise.all([loadAssets(), loadLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save asset.");
    } finally {
      setSaving(false);
    }
  };

  const removeAsset = async (asset: AssetItem) => {
    const ok = window.confirm(`Delete asset "${asset.name}"?`);
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/assets/${asset.id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete asset");
      await Promise.all([loadAssets(), loadLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete asset.");
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    const value = categoryInput.trim();
    if (!value) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/assets/categories/`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ name: value }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      setCategoryInput("");
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category.");
    } finally {
      setSaving(false);
    }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const term = search.toLowerCase();
      const matchesSearch =
        asset.name.toLowerCase().includes(term) ||
        String(asset.category_name ?? "").toLowerCase().includes(term);
      const matchesStatus = statusFilter === "ALL" || asset.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || String(asset.category ?? "") === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [assets, search, statusFilter, categoryFilter]);

  const totals = useMemo(() => {
    const totalAssets = assets.length;
    const working = assets.filter((a) => a.status === "WORKING").length;
    const damaged = assets.filter((a) => a.status === "DAMAGED").length;
    const underRepair = assets.filter((a) => a.status === "REPAIR").length;
    return { totalAssets, working, damaged, underRepair };
  }, [assets]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(130deg,#ffffff_0%,#f8f7ff_45%,#f4f2ff_100%)] p-7 shadow-[0_20px_55px_rgba(76,29,149,0.1)]">
        <div className="absolute -right-10 -top-14 h-52 w-52 rounded-3xl bg-violet-200/30 blur-3xl" />
        <div className="absolute -left-14 bottom-0 h-36 w-36 rounded-3xl bg-indigo-200/25 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Infrastructure Control</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Asset Management</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Track operational equipment quantity, condition, category and admin-only maintenance records.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(79,70,229,0.28)]"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Total Assets" value={totals.totalAssets} icon={<Boxes className="h-5 w-5 text-violet-700" />} />
        <StatCard title="Working" value={totals.working} icon={<ClipboardList className="h-5 w-5 text-emerald-700" />} />
        <StatCard title="Damaged" value={totals.damaged} icon={<ShieldAlert className="h-5 w-5 text-rose-700" />} />
        <StatCard title="Under Repair" value={totals.underRepair} icon={<Pencil className="h-5 w-5 text-amber-700" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset/category"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition focus:border-violet-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | AssetItem["status"])}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-violet-500"
            >
              <option value="ALL">All Status</option>
              <option value="WORKING">Working</option>
              <option value="DAMAGED">Damaged</option>
              <option value="REPAIR">Repair</option>
              <option value="LOST">Lost</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-violet-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading assets...</p>
          ) : filteredAssets.length === 0 ? (
            <p className="text-sm text-slate-500">No assets found.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Asset</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Purchase</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Warranty End</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{asset.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{asset.category_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{asset.quantity}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[asset.status]}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{asset.purchase_date || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{asset.warranty_end || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(asset)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeAsset(asset)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <h2 className="text-lg font-semibold text-slate-900">Asset Categories</h2>
            <p className="mt-1 text-xs text-slate-500">Create categories used by asset records.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                placeholder="New category"
                className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-violet-500"
              />
              <button
                type="button"
                onClick={() => void addCategory()}
                disabled={saving || !categoryInput.trim()}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Add
              </button>
            </div>
            <div className="mt-4 max-h-44 overflow-auto rounded-xl border border-slate-200">
              {categories.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">No categories.</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700 last:border-b-0">
                    {cat.name}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent Asset Logs</h2>
              <span className="text-xs font-semibold text-slate-500">{logs.length} rows</span>
            </div>
            <div className="max-h-96 overflow-auto rounded-xl border border-slate-200">
              {logs.length === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-500">No log records found.</p>
              ) : (
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Asset</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Action</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Qty</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">By</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 50).map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-2 text-xs text-slate-700">{log.asset_name || "-"}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-slate-800">{log.action}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{log.quantity_change}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{log.performed_by_username || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAssetModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{editingAsset ? "Edit Asset" : "Add Asset"}</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Asset name"
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 md:col-span-2"
              />
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <input
                value={form.quantity}
                type="number"
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="Quantity"
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as AssetItem["status"] }))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              >
                <option value="WORKING">WORKING</option>
                <option value="DAMAGED">DAMAGED</option>
                <option value="REPAIR">REPAIR</option>
                <option value="LOST">LOST</option>
              </select>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm((prev) => ({ ...prev, purchase_date: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <input
                type="date"
                value={form.warranty_end}
                onChange={(e) => setForm((prev) => ({ ...prev, warranty_end: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <textarea
                value={form.remarks}
                onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                placeholder="Remarks"
                className="min-h-24 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 md:col-span-2"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAssetModal(false);
                  setEditingAsset(null);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveAsset()}
                disabled={saving}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: JSX.Element }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      {icon}
    </div>
    <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
  </div>
);

export default Assets;



