import { useEffect, useMemo, useState } from "react";
import { History, TicketPercent } from "lucide-react";

const API_BASE = "http://192.168.1.18:8000";

interface CouponUsage {
  id: number;
  user: string;
  coupon: string;
  order: string;
  discount_amount: number;
  used_at: string;
}

const toMoney = (value: number) => `Rs ${value.toFixed(2)}`;

const CouponReport = () => {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [usages, setUsages] = useState<CouponUsage[]>([]);
  const [recordsCount, setRecordsCount] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchCouponReport = async (q = search) => {
    setLoading(true);
    setErrorText("");
    try {
      const url = new URL(`${API_BASE}/api/reports/coupons/usage/`);
      if (q.trim()) url.searchParams.set("q", q.trim());
      if (fromDate) url.searchParams.set("from_date", fromDate);
      if (toDate) url.searchParams.set("to_date", toDate);

      const res = await fetch(url.toString(), { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to load coupon report.");

      const data = await res.json().catch(() => ({}));
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
      setRecordsCount(Number(data?.summary?.records ?? records.length));
      setTotalDiscount(Number(data?.summary?.total_discount ?? 0));
    } catch (error) {
      console.error("Fetch coupon report failed:", error);
      setErrorText(error instanceof Error ? error.message : "Unable to load coupon report.");
      setUsages([]);
      setRecordsCount(0);
      setTotalDiscount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCouponReport("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleSummary = useMemo(
    () => `${recordsCount} records | ${toMoney(totalDiscount)} total discount`,
    [recordsCount, totalDiscount]
  );

  return (
    <div className="w-full space-y-6 py-8">
      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Coupon Reports</h1>
            <p className="text-sm text-muted-foreground">Coupon usage report with search and date filters.</p>
            <p className="mt-1 text-xs text-muted-foreground">{titleSummary}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-secondary px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Records</p>
              <p className="text-sm font-semibold text-foreground">{recordsCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Discount</p>
              <p className="text-sm font-semibold text-foreground">{toMoney(totalDiscount)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative w-full max-w-sm">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, coupon, order"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => void fetchCouponReport()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80"
          >
            <TicketPercent className="h-4 w-4" />
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFromDate("");
              setToDate("");
              void fetchCouponReport("");
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            <History className="h-4 w-4" />
            Reset
          </button>
        </div>

        {errorText && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorText}
          </div>
        )}

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

              {!loading && usages.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                    No coupon usage records found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                    Loading coupon report...
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

export default CouponReport;
