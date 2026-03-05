import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Gift, History, TicketPercent } from "lucide-react";

const API_BASE = "https://billingdemo-irsxd.ondigitalocean.app";

interface Coupon {
  id: number;
  code: string;
  discount_type: "AMOUNT" | "PERCENT" | "FREE_ITEM";
  value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  max_uses: number | null;
  description: string;
  free_item: string;
  free_item_category: string;
  first_time_only: boolean;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  used: number;
}

interface CouponUsage {
  id: number;
  user: string;
  coupon: string;
  order: string;
  discount_amount: number;
  used_at: string;
}

interface ProductOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface CouponForm {
  code: string;
  discountType: "AMOUNT" | "PERCENT" | "FREE_ITEM";
  value: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  maxUses: string;
  description: string;
  freeItem: string;
  freeItemCategory: string;
  validFrom: string;
  validTo: string;
  firstTimeOnly: boolean;
  isActive: boolean;
}

const initialForm: CouponForm = {
  code: "",
  discountType: "PERCENT",
  value: "",
  minOrderAmount: "0",
  maxDiscountAmount: "",
  maxUses: "",
  description: "",
  freeItem: "",
  freeItemCategory: "",
  validFrom: "",
  validTo: "",
  firstTimeOnly: false,
  isActive: true,
};

const formatDateTimeLocal = (value: string | null) => {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const offset = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

const toMoney = (value: number) => `Rs ${value.toFixed(2)}`;
const toList = (data: unknown): Record<string, unknown>[] => {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const results = obj.results;
    if (Array.isArray(results)) return results as Record<string, unknown>[];
  }
  return [];
};

const Coupons = () => {
  const [search, setSearch] = useState("");
  const [usageSearch, setUsageSearch] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [usages, setUsages] = useState<CouponUsage[]>([]);
  const [usageRecordsCount, setUsageRecordsCount] = useState(0);
  const [usageTotalDiscount, setUsageTotalDiscount] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CouponForm>(initialForm);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusText, setStatusText] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access");
    return { Authorization: `Bearer ${token}` };
  };

  const mapCoupon = (row: Record<string, unknown>): Coupon => ({
    id: Number(row.id),
    code: String(row.code ?? ""),
    discount_type: String(row.discount_type ?? "PERCENT") as "AMOUNT" | "PERCENT" | "FREE_ITEM",
    value: Number(row.value ?? 0),
    min_order_amount: Number(row.min_order_amount ?? 0),
    max_discount_amount: row.max_discount_amount == null ? null : Number(row.max_discount_amount),
    max_uses: row.max_uses == null ? null : Number(row.max_uses),
    description: String(row.description ?? ""),
    free_item: String(row.free_item ?? ""),
    free_item_category: String(row.free_item_category ?? ""),
    first_time_only: Boolean(row.first_time_only),
    is_active: Boolean(row.is_active),
    valid_from: row.valid_from ? String(row.valid_from) : null,
    valid_to: row.valid_to ? String(row.valid_to) : null,
    used: Number(row.used ?? 0),
  });

  const fetchCoupons = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/coupons/`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCoupons(list.map((row: Record<string, unknown>) => mapCoupon(row)));
    } catch (err) {
      console.error("Fetch coupons failed:", err);
    }
  };

  const fetchCouponUsage = async (q = usageSearch) => {
    try {
      const url = new URL(`${API_BASE}/api/orders/coupons/usage/`);
      if (q.trim()) url.searchParams.set("q", q.trim());
      const res = await fetch(url.toString(), { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const records = Array.isArray(data?.records) ? data.records : [];
      setUsages(
        records.map((row: Record<string, unknown>) => ({
          id: Number(row.id ?? 0),
          user: String(row.user ?? "-"),
          coupon: String(row.coupon ?? "-"),
          order: String(row.order ?? "-"),
          discount_amount: Number(row.discount_amount ?? 0),
          used_at: String(row.used_at ?? ""),
        }))
      );
      setUsageRecordsCount(Number(data?.summary?.records ?? records.length));
      setUsageTotalDiscount(Number(data?.summary?.total_discount ?? 0));
    } catch (err) {
      console.error("Fetch coupon usage failed:", err);
    }
  };

  const fetchProductsAndCategories = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE}/api/products/products/`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/products/categories/`, { headers: getAuthHeaders() }),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        const list = toList(data);
        setProducts(
          list
            .map((row: Record<string, unknown>) => ({
              id: String(row.id ?? ""),
              name: String(row.name ?? ""),
            }))
            .filter((row: ProductOption) => row.id && row.name)
        );
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        const list = toList(data);
        setCategories(
          list
            .map((row: Record<string, unknown>) => ({
              id: String(row.id ?? ""),
              name: String(row.name ?? ""),
            }))
            .filter((row: CategoryOption) => row.id && row.name)
        );
      }
    } catch (err) {
      console.error("Fetch products/categories failed:", err);
    }
  };

  useEffect(() => {
    void fetchCoupons();
    void fetchCouponUsage("");
    void fetchProductsAndCategories();
  }, []);

  const filteredCoupons = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return coupons;
    return coupons.filter((c) => c.code.toLowerCase().includes(term));
  }, [coupons, search]);

  const activeCoupons = useMemo(() => coupons.filter((coupon) => coupon.is_active).length, [coupons]);
  const totalRedemptions = useMemo(() => coupons.reduce((sum, coupon) => sum + coupon.used, 0), [coupons]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const startEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      discountType: coupon.discount_type,
      value: coupon.discount_type === "FREE_ITEM" ? "" : String(coupon.value),
      minOrderAmount: String(coupon.min_order_amount),
      maxDiscountAmount: coupon.max_discount_amount == null ? "" : String(coupon.max_discount_amount),
      maxUses: coupon.max_uses == null ? "" : String(coupon.max_uses),
      description: coupon.description,
      freeItem: coupon.free_item,
      freeItemCategory: coupon.free_item_category,
      validFrom: formatDateTimeLocal(coupon.valid_from),
      validTo: formatDateTimeLocal(coupon.valid_to),
      firstTimeOnly: coupon.first_time_only,
      isActive: coupon.is_active,
    });
  };

  const saveCoupon = async () => {
    if (!form.code.trim()) {
      setStatusText("Coupon code is required.");
      return;
    }
    if (form.discountType !== "FREE_ITEM" && !form.value) {
      setStatusText("Discount value is required.");
      return;
    }
    if (form.discountType === "FREE_ITEM" && !form.freeItem && !form.freeItemCategory) {
      setStatusText("Select a free item or a free item category.");
      return;
    }

    setSaving(true);
    const payload: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discountType,
      value: form.discountType === "FREE_ITEM" ? "0" : form.value,
      min_order_amount: form.minOrderAmount || "0",
      max_discount_amount: form.maxDiscountAmount || null,
      max_uses: form.maxUses || null,
      description: form.description || "",
      free_item: form.discountType === "FREE_ITEM" ? form.freeItem || "" : "",
      free_item_category: form.discountType === "FREE_ITEM" ? form.freeItemCategory || "" : "",
      valid_from: form.validFrom || null,
      valid_to: form.validTo || null,
      first_time_only: form.firstTimeOnly,
      is_active: form.isActive,
    };

    try {
      const url = editingId
        ? `${API_BASE}/api/orders/coupons/${editingId}/`
        : `${API_BASE}/api/orders/coupons/`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatusText(String(err?.detail ?? err?.error ?? "Could not save coupon."));
        return;
      }
      await fetchCoupons();
      setStatusText(editingId ? "Coupon updated." : "Coupon created.");
      resetForm();
    } catch (err) {
      console.error("Save coupon failed:", err);
      setStatusText("Could not save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCoupon = async (couponId: number) => {
    const ok = window.confirm("Delete this coupon?");
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/api/orders/coupons/${couponId}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setStatusText("Failed to delete coupon.");
        return;
      }
      await fetchCoupons();
      if (editingId === couponId) resetForm();
      setStatusText("Coupon deleted.");
    } catch (err) {
      console.error("Delete coupon failed:", err);
      setStatusText("Failed to delete coupon.");
    }
  };

  const typeLabel = (type: Coupon["discount_type"]) => {
    if (type === "PERCENT") return "Percentage";
    if (type === "AMOUNT") return "Fixed Amount";
    return "Free Item";
  };

  return (
    <div className="w-full py-8 space-y-6">
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-6 py-6 text-white shadow-lg"
      >
        <div className="absolute right-0 top-0 h-24 w-24 -translate-y-1/3 translate-x-1/3 rounded-full bg-white/15" />
        <div className="absolute bottom-0 left-0 h-20 w-20 -translate-x-1/3 translate-y-1/3 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Admin</p>
            <h1 className="mt-1 text-2xl font-bold">Coupons Manager</h1>
            <p className="mt-1 text-sm text-white/85">Create, monitor and optimize promotional offers.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
            <TicketPercent className="h-4 w-4" />
            {coupons.length} total coupons
          </div>
        </div>
      </motion.section>

      {statusText && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">
          {statusText}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Coupons" value={String(coupons.length)} icon={<TicketPercent className="h-4 w-4" />} />
        <StatCard label="Active Coupons" value={String(activeCoupons)} icon={<Gift className="h-4 w-4" />} />
        <StatCard label="Total Redemptions" value={String(totalRedemptions)} icon={<History className="h-4 w-4" />} />
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{editingId ? "Edit Coupon" : "Create Coupon"}</h2>
            <p className="text-xs text-muted-foreground">
              Configure discount rules and validity in one place.
            </p>
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <Field label="Code">
            <input
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="WELCOME10"
            />
          </Field>

          <Field label="Discount Type">
            <select
              value={form.discountType}
              onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as CouponForm["discountType"] }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="PERCENT">Percentage</option>
              <option value="AMOUNT">Amount</option>
              <option value="FREE_ITEM">Free Item</option>
            </select>
          </Field>

          <Field label="Discount Value">
            <input
              type="number"
              min={0}
              disabled={form.discountType === "FREE_ITEM"}
              value={form.value}
              onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:bg-slate-100"
              placeholder={form.discountType === "PERCENT" ? "10" : "100"}
            />
          </Field>

          <Field label="Min Order Amount">
            <input
              type="number"
              min={0}
              value={form.minOrderAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <Field label="Max Discount Amount">
            <input
              type="number"
              min={0}
              value={form.maxDiscountAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, maxDiscountAmount: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="Leave empty for no limit"
            />
          </Field>

          <Field label="Max Uses">
            <input
              type="number"
              min={0}
              value={form.maxUses}
              onChange={(e) => setForm((prev) => ({ ...prev, maxUses: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="Leave empty for no limit"
            />
          </Field>

          <Field label="Valid From">
            <input
              type="datetime-local"
              value={form.validFrom}
              onChange={(e) => setForm((prev) => ({ ...prev, validFrom: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>

          <Field label="Valid Until">
            <input
              type="datetime-local"
              value={form.validTo}
              onChange={(e) => setForm((prev) => ({ ...prev, validTo: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="Free Item">
            <select
              value={form.freeItem}
              onChange={(e) => setForm((prev) => ({ ...prev, freeItem: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Select free item</option>
              {!!form.freeItem && !products.some((product) => product.name === form.freeItem) && (
                <option value={form.freeItem}>{form.freeItem}</option>
              )}
              {products.map((product) => (
                <option key={product.id} value={product.name}>
                  {product.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Free Item Category">
            <select
              value={form.freeItemCategory}
              onChange={(e) => setForm((prev) => ({ ...prev, freeItemCategory: e.target.value }))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Select free item category</option>
              {!!form.freeItemCategory &&
                !categories.some((category) => category.name === form.freeItemCategory) && (
                  <option value={form.freeItemCategory}>{form.freeItemCategory}</option>
                )}
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              placeholder="Internal note or customer-facing description"
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={form.firstTimeOnly}
              onChange={(e) => setForm((prev) => ({ ...prev, firstTimeOnly: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            First-time users only
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            Active
          </label>
          <button
            onClick={saveCoupon}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
          </button>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Coupon List</h2>
            <p className="text-xs text-muted-foreground">Search and manage coupon configurations.</p>
          </div>
          <div className="relative w-full max-w-sm">
            
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by coupon code"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3 font-medium">Code</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Value</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Used</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-3 font-semibold text-foreground">{coupon.code}</td>
                  <td className="px-3 py-3 text-muted-foreground">{typeLabel(coupon.discount_type)}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {coupon.discount_type === "FREE_ITEM"
                      ? "-"
                      : coupon.discount_type === "PERCENT"
                      ? `${coupon.value}%`
                      : toMoney(coupon.value)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        coupon.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {coupon.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{coupon.used}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(coupon)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void deleteCoupon(coupon.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No coupons found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Coupon Usage</h2>
            <p className="text-xs text-muted-foreground">
              Track redemption history and discount impact.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Records" value={String(usageRecordsCount)} />
            <MiniStat label="Discount" value={toMoney(usageTotalDiscount)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative w-full max-w-lg">
            
            <input
              value={usageSearch}
              onChange={(e) => setUsageSearch(e.target.value)}
              placeholder="Search by user, coupon, order, or ID"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <button
            onClick={() => void fetchCouponUsage()}
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80"
          >
            Search
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3 font-medium">ID</th>
                <th className="px-3 py-3 font-medium">User</th>
                <th className="px-3 py-3 font-medium">Coupon</th>
                <th className="px-3 py-3 font-medium">Order</th>
                <th className="px-3 py-3 font-medium">Discount</th>
                <th className="px-3 py-3 font-medium">Used At</th>
              </tr>
            </thead>
            <tbody>
              {usages.map((usage) => (
                <tr key={usage.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-3 font-medium text-foreground">{usage.id}</td>
                  <td className="px-3 py-3 text-muted-foreground">{usage.user}</td>
                  <td className="px-3 py-3 text-muted-foreground">{usage.coupon}</td>
                  <td className="px-3 py-3 text-muted-foreground">{usage.order}</td>
                  <td className="px-3 py-3 text-muted-foreground">{toMoney(usage.discount_amount)}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {usage.used_at ? new Date(usage.used_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}

              {usages.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                    No usage records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
    {children}
  </div>
);

const StatCard = ({ label, value, icon }: { label: string; value: string; icon: ReactNode }) => (
  <div className="glass-card rounded-2xl p-4">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      </div>
      <div className="rounded-lg bg-violet-100 p-2 text-violet-700">{icon}</div>
    </div>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-secondary px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export default Coupons;

