import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Search,
  Truck,
  X,
  Pencil,
} from "lucide-react";

const API_BASE = "http://192.168.1.18:8000";

interface Vendor {
  id: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  email: string;
  city: string;
  address?: string;
  created_at?: string;
  lastDelivery?: string;
  monthlySpend?: number;
}

interface HistoryRow {
  id: string;
  invoice_number: string;
  date: string;
  total_amount: number;
}

interface VendorHistoryResponse {
  vendor: Vendor;
  summary: {
    total_invoices: number;
    lifetime_spend: number;
    monthly_spend: number;
    last_delivery?: string;
  };
  history: HistoryRow[];
}

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
};

const money = (v?: number) => `Rs.${(v ?? 0).toLocaleString()}`;

const Vendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [historyData, setHistoryData] = useState<VendorHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    contact: "",
    phone: "",
    email: "",
    city: "",
    address: "",
  });

  const getAuthHeaders = (withJson = false) => {
    const token = localStorage.getItem("access");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    if (withJson) headers["Content-Type"] = "application/json";
    return headers;
  };

  const mapVendor = (row: Record<string, unknown>): Vendor => ({
    id: String(row.id ?? ""),
    name: String(row.name ?? "Unknown"),
    category: String(row.category ?? "-"),
    contact: String(row.contact ?? row.contact_person ?? "-"),
    phone: String(row.phone ?? "-"),
    email: String(row.email ?? "-"),
    city: String(row.city ?? "-"),
    address: row.address ? String(row.address) : "",
    created_at: row.created_at ? String(row.created_at) : undefined,
    lastDelivery: row.lastDelivery ? String(row.lastDelivery) : undefined,
    monthlySpend: Number(row.monthlySpend ?? 0),
  });

  const loadVendors = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inventory/vendors/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch vendors");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setVendors(list.map((row: Record<string, unknown>) => mapVendor(row)));
    } catch (err) {
      console.error("Vendor fetch error:", err);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVendors();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return vendors.filter((v) => {
      return (
        v.name.toLowerCase().includes(term) ||
        v.id.toLowerCase().includes(term) ||
        v.category.toLowerCase().includes(term) ||
        v.city.toLowerCase().includes(term)
      );
    });
  }, [search, vendors]);

  const kpis = useMemo(() => {
    const spend = vendors.reduce((sum, v) => sum + (v.monthlySpend ?? 0), 0);
    const avgSpend = vendors.length ? Math.round(spend / vendors.length) : 0;
    return {
      total: vendors.length,
      spend,
      avgSpend,
    };
  }, [vendors]);

  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      contact: "",
      phone: "",
      email: "",
      city: "",
      address: "",
    });
  };

  const createVendor = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/inventory/vendors/`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          contact_person: form.contact,
          phone: form.phone,
          email: form.email,
          city: form.city,
          address: form.address,
        }),
      });
      if (!res.ok) throw new Error("Failed to create vendor");
      setCreateOpen(false);
      resetForm();
      await loadVendors();
    } catch (err) {
      console.error("Vendor create error:", err);
      alert("Failed to create vendor.");
    } finally {
      setSaving(false);
    }
  };

  const saveVendor = async (vendor: Vendor) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/inventory/vendors/${vendor.id}/`, {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          name: vendor.name,
          category: vendor.category,
          contact_person: vendor.contact,
          phone: vendor.phone,
          email: vendor.email,
          city: vendor.city,
          address: vendor.address ?? "",
        }),
      });
      if (!res.ok) throw new Error("Failed to update vendor");
      await loadVendors();
      setSelectedVendor(null);
      setHistoryData(null);
    } catch (err) {
      console.error("Vendor update error:", err);
      alert("Failed to update vendor.");
    } finally {
      setSaving(false);
    }
  };

  const removeVendor = async (vendor: Vendor) => {
    if (!confirm(`Delete vendor ${vendor.name}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/inventory/vendors/${vendor.id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete vendor");
      await loadVendors();
      setSelectedVendor(null);
      setHistoryData(null);
    } catch (err) {
      console.error("Vendor delete error:", err);
      alert("Failed to delete vendor.");
    } finally {
      setSaving(false);
    }
  };

  const openVendorDetail = async (vendor: Vendor) => {
    setIsEditMode(false);
    setSelectedVendor(vendor);
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const [detailRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/api/inventory/vendors/${vendor.id}/`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/inventory/vendors/${vendor.id}/history/`, { headers: getAuthHeaders() }),
      ]);

      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setSelectedVendor(mapVendor(detailData));
      }

      if (historyRes.ok) {
        const historyJson = await historyRes.json();
        const normalized: VendorHistoryResponse = {
          vendor: mapVendor((historyJson.vendor ?? {}) as Record<string, unknown>),
          summary: {
            total_invoices: Number(historyJson.summary?.total_invoices ?? 0),
            lifetime_spend: Number(historyJson.summary?.lifetime_spend ?? 0),
            monthly_spend: Number(historyJson.summary?.monthly_spend ?? 0),
            last_delivery: historyJson.summary?.last_delivery
              ? String(historyJson.summary.last_delivery)
              : undefined,
          },
          history: Array.isArray(historyJson.history)
            ? historyJson.history.map((row: Record<string, unknown>) => ({
                id: String(row.id ?? ""),
                invoice_number: String(row.invoice_number ?? "-"),
                date: String(row.date ?? ""),
                total_amount: Number(row.total_amount ?? 0),
              }))
            : [],
        };
        setHistoryData(normalized);
      } else {
        setHistoryData({
          vendor,
          summary: {
            total_invoices: 0,
            lifetime_spend: 0,
            monthly_spend: vendor.monthlySpend ?? 0,
            last_delivery: vendor.lastDelivery,
          },
          history: [],
        });
      }
    } catch (err) {
      console.error("Vendor detail/history error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="relative space-y-6 overflow-hidden animate-fade-in">
      <div className="pointer-events-none absolute -left-20 top-8 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-24 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(130deg,#ffffff_0%,#f8f7ff_45%,#f4f2ff_100%)] p-7 shadow-[0_20px_55px_rgba(76,29,149,0.1)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_88%_30%,rgba(255,255,255,0.14),transparent_28%)]" />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">Supply Command</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Vendors Hub</h1>
            <p className="mt-1 text-sm text-slate-600">Manage supplier health, spend, contact, and invoice history.</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(79,70,229,0.28)] transition hover:opacity-95"
          >
            Add Vendor
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Vendors" value={kpis.total} icon={<Building2 className="h-4 w-4" />} />
        <KpiCard label="Total Monthly Spend" value={money(kpis.spend)} icon={<CircleDollarSign className="h-4 w-4" />} />
        <KpiCard label="Avg Spend per Vendor" value={money(kpis.avgSpend)} icon={<Truck className="h-4 w-4" />} />
        <KpiCard label="Records Loaded" value={vendors.length} icon={<BadgeCheck className="h-4 w-4" />} />
      </section>

      <section className="rounded-2xl border border-violet-200/70 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vendor, id, category, city"
              className="w-full rounded-xl border border-violet-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-300/40"
            />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-purple-100 bg-white p-6 text-sm">Loading vendors...</div>
      ) : (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {filtered.map((vendor, idx) => (
            <motion.article
              key={vendor.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl border border-violet-200/70 bg-white p-5 shadow-[0_12px_28px_rgba(79,70,229,0.1)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-violet-500">{vendor.id}</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">{vendor.name}</h3>
                  <p className="text-sm text-slate-500">{vendor.category}</p>
                </div>
                <button
                  onClick={() => openVendorDetail(vendor)}
                  className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                >
                  View
                </button>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p className="flex items-center gap-2 leading-5">
                  <BadgeCheck className="h-3.5 w-3.5 text-violet-600" />
                  {vendor.contact}
                </p>
                <p className="flex items-center gap-2 leading-5">
                  <Phone className="h-3.5 w-3.5 text-violet-600" />
                  {vendor.phone}
                </p>
                <p className="flex items-center gap-2 leading-5">
                  <Mail className="h-3.5 w-3.5 text-violet-600" />
                  {vendor.email}
                </p>
                <p className="flex items-center gap-2 leading-5">
                  <MapPin className="h-3.5 w-3.5 text-violet-600" />
                  {vendor.city}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-violet-200/70 bg-violet-50/60 p-3 text-xs">
                <div>
                  <p className="text-slate-500">Last Delivery</p>
                  <p className="mt-0.5 font-semibold text-slate-900">{formatDate(vendor.lastDelivery)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Monthly Spend</p>
                  <p className="mt-0.5 font-semibold text-slate-900">{money(vendor.monthlySpend)}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      )}

      {!loading && !filtered.length ? (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No vendors found.</p>
          <p className="mt-1 text-xs text-slate-500">Try a different search term.</p>
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-violet-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8f7ff_100%)] px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Create Vendor</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
              <FormInput placeholder="Vendor Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
              <FormInput placeholder="Category" value={form.category} onChange={(v) => setForm((p) => ({ ...p, category: v }))} />
              <FormInput placeholder="Contact Person" value={form.contact} onChange={(v) => setForm((p) => ({ ...p, contact: v }))} />
              <FormInput placeholder="Phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
              <FormInput placeholder="Email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
              <FormInput placeholder="City" value={form.city} onChange={(v) => setForm((p) => ({ ...p, city: v }))} />
              <div className="md:col-span-2">
                <FormInput placeholder="Address" value={form.address} onChange={(v) => setForm((p) => ({ ...p, address: v }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-violet-100 px-5 py-4">
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={createVendor}
                disabled={saving || !form.name || !form.category}
                className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white hover:opacity-95 disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create Vendor"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedVendor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8f7ff_100%)] px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedVendor.name}</h3>
                <p className="text-xs text-slate-500">Vendor ID: {selectedVendor.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditMode((prev) => !prev)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                    isEditMode
                      ? "border border-amber-300 bg-amber-50 text-amber-700"
                      : "border border-violet-200 bg-violet-100 text-violet-700"
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {isEditMode ? "Editing" : "Edit"}
                </button>
                <span className="rounded-full border border-violet-200 bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                  {isEditMode ? "Edit Mode" : "View Mode"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVendor(null);
                    setHistoryData(null);
                    setIsEditMode(false);
                  }}
                  className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto">
              <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
                <FormInput label="Name" value={selectedVendor.name} readOnly={!isEditMode} onChange={(v) => setSelectedVendor({ ...selectedVendor, name: v })} />
                <FormInput label="Category" value={selectedVendor.category} readOnly={!isEditMode} onChange={(v) => setSelectedVendor({ ...selectedVendor, category: v })} />
                <FormInput label="Contact Person" value={selectedVendor.contact} readOnly={!isEditMode} onChange={(v) => setSelectedVendor({ ...selectedVendor, contact: v })} />
                <FormInput label="Phone" value={selectedVendor.phone} readOnly={!isEditMode} onChange={(v) => setSelectedVendor({ ...selectedVendor, phone: v })} />
                <FormInput label="Email" value={selectedVendor.email} readOnly={!isEditMode} onChange={(v) => setSelectedVendor({ ...selectedVendor, email: v })} />
                <FormInput label="City" value={selectedVendor.city} readOnly={!isEditMode} onChange={(v) => setSelectedVendor({ ...selectedVendor, city: v })} />
                <div className="md:col-span-2">
                  <FormInput label="Address" value={selectedVendor.address ?? ""} readOnly={!isEditMode} onChange={(v) => setSelectedVendor({ ...selectedVendor, address: v })} />
                </div>
              </div>

              <div className="border-t border-violet-100 p-5">
                <h4 className="mb-3 text-sm font-semibold text-slate-900">Vendor History</h4>
                {historyLoading ? (
                  <p className="text-sm text-slate-500">Loading history...</p>
                ) : (
                  <>
                    <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                      <SummaryPill label="Invoices" value={String(historyData?.summary.total_invoices ?? 0)} />
                      <SummaryPill label="Lifetime Spend" value={money(historyData?.summary.lifetime_spend)} />
                      <SummaryPill label="Monthly Spend" value={money(historyData?.summary.monthly_spend)} />
                      <SummaryPill label="Last Delivery" value={formatDate(historyData?.summary.last_delivery)} icon={<Clock3 className="h-3.5 w-3.5" />} />
                    </div>
                    <div className="max-h-44 overflow-auto rounded-xl border border-violet-200/70">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-violet-50">
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-violet-700">Invoice #</th>
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-violet-700">Date</th>
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-violet-700">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-violet-100">
                          {(historyData?.history ?? []).map((row) => (
                            <tr key={row.id}>
                              <td className="px-3 py-2 text-sm text-slate-700">{row.invoice_number}</td>
                              <td className="px-3 py-2 text-sm text-slate-700">{formatDate(row.date)}</td>
                              <td className="px-3 py-2 text-sm font-semibold text-slate-800">{money(row.total_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!historyData?.history?.length ? (
                        <p className="p-3 text-sm text-slate-500">No invoice history found.</p>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-violet-100 px-5 py-4">
              <button
                onClick={() => removeVendor(selectedVendor)}
                disabled={saving}
                className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                Delete
              </button>
              {!isEditMode ? (
                <button
                  onClick={() => setIsEditMode(true)}
                    className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white hover:opacity-95"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Cancel Edit
                  </button>
                  <button
                    onClick={() => saveVendor(selectedVendor)}
                    disabled={saving}
                    className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white hover:opacity-95 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function KpiCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-violet-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] p-4 shadow-[0_10px_24px_rgba(79,70,229,0.1)]">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-violet-600">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function FormInput({
  label,
  placeholder,
  value,
  readOnly,
  onChange,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      {label ? <p className="mb-1 text-xs text-slate-500">{label}</p> : null}
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm ${
          readOnly
            ? "border-violet-100 bg-slate-50 text-slate-700"
            : "border-violet-200 bg-white text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-300/40"
        }`}
      />
    </div>
  );
}

function SummaryPill({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-violet-200/70 bg-violet-50 p-3">
      <p className="flex items-center gap-1 text-xs text-violet-700">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default Vendors;




