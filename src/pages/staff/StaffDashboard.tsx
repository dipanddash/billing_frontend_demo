import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import KPICard from "@/components/KPICard";
import StatusBadge from "@/components/StatusBadge";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Megaphone,
  ReceiptText,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BASE_URL = "http://192.168.1.18:8000";

const API = {
  dashboard: `${BASE_URL}/api/reports/dashboard/`,
  peakTime: `${BASE_URL}/api/reports/sales/peak-time/`,
  todayOrders: `${BASE_URL}/api/orders/today/`,
  recentOrders: `${BASE_URL}/api/orders/recent/?limit=10`,
  tables: `${BASE_URL}/api/tables/list/`,
  me: `${BASE_URL}/api/accounts/me/`,
  permissions: `${BASE_URL}/api/accounts/me/permissions/`,
  paymentMethod: `${BASE_URL}/api/reports/payments/method/`,
};

const QUEUE_TEMPLATE = [
  { label: "Pending", variant: "pending" as const },
  { label: "Cooking", variant: "cooking" as const },
  { label: "Ready", variant: "ready" as const },
  { label: "Served", variant: "served" as const },
];

const PAYMENT_COLORS = ["#2563eb", "#0f766e", "#ca8a04", "#9333ea", "#ea580c", "#475569"];

const quickActions = [
  { label: "Open Tables", path: "/staff/tables" },
  { label: "Kitchen Board", path: "/staff/kitchen" },
  { label: "Orders List", path: "/staff/orders" },
  { label: "Shift Summary", path: "/staff/shift" },
];

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [showTakeawayModal, setShowTakeawayModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [creatingTakeaway, setCreatingTakeaway] = useState(false);
  const [takeawayError, setTakeawayError] = useState("");
  const [liveRevenueTrend, setLiveRevenueTrend] = useState<Array<{ slot: string; revenue: number; bills: number }>>([]);
  const [liveQueueBoard, setLiveQueueBoard] = useState(
    QUEUE_TEMPLATE.map((item) => ({ ...item, count: 0 }))
  );
  const [livePaymentMix, setLivePaymentMix] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [openTablesCount, setOpenTablesCount] = useState<number | null>(null);
  const [staffName, setStaffName] = useState("Staff");
  const [canTakeaway, setCanTakeaway] = useState(true);
  const [todayTotals, setTodayTotals] = useState({
    revenue: 0,
    bills: 0,
    target: 0,
    collectionRate: 0,
    conversion: 0,
    repeatCustomers: 0,
    revenueTrend: 0,
    billsTrend: 0,
    conversionTrend: 0,
    repeatTrend: 0,
  });

  const asNumber = (value: unknown, fallback = 0) => {
    const n =
      typeof value === "string"
        ? Number(value.replace(/[^0-9.-]/g, ""))
        : Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const asPercentNumber = (value: unknown, fallback = 0) => {
    if (value === null || value === undefined || value === "") return fallback;
    return asNumber(value, fallback);
  };

  const asArray = (value: unknown): any[] => {
    if (Array.isArray(value)) return value;
    if (Array.isArray((value as any)?.results)) return (value as any).results;
    if (Array.isArray((value as any)?.data)) return (value as any).data;
    return [];
  };

  const pickReportRows = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.summary)) return payload.summary;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;

    const authHeaders = { Authorization: `Bearer ${token}` };

    const metricValue = (metrics: any[], names: string[], fallback = 0) => {
      const normalized = names.map((name) => name.trim().toLowerCase());
      const row = metrics.find((m) => {
        const key = String(m?.metric ?? m?.name ?? m?.label ?? "").trim().toLowerCase();
        return normalized.includes(key);
      });
      return asNumber(row?.value ?? row?.amount ?? row?.count ?? row?.total, fallback);
    };
    const metricTrend = (metrics: any[], names: string[], fallback = 0) => {
      const normalized = names.map((name) => name.trim().toLowerCase());
      const row = metrics.find((m) => {
        const key = String(m?.metric ?? m?.name ?? m?.label ?? "").trim().toLowerCase();
        return normalized.includes(key);
      });
      return asPercentNumber(
        row?.change_pct ??
          row?.change_percent ??
          row?.change ??
          row?.trend_pct ??
          row?.trend,
        fallback
      );
    };

    const loadDashboard = async () => {
      try {
        const [
          dashboardRes,
          peakRes,
          todayRes,
          recentRes,
          tablesRes,
          meRes,
          permissionsRes,
          paymentRes,
        ] = await Promise.all([
          fetch(API.dashboard, { headers: authHeaders }),
          fetch(API.peakTime, { headers: authHeaders }),
          fetch(API.todayOrders, { headers: authHeaders }),
          fetch(API.recentOrders, { headers: authHeaders }),
          fetch(API.tables, { headers: authHeaders }),
          fetch(API.me, { headers: authHeaders }),
          fetch(API.permissions, { headers: authHeaders }),
          fetch(API.paymentMethod, { headers: authHeaders }),
        ]);

        let todayOrders: any[] = [];
        if (todayRes.ok) {
          todayOrders = asArray(await todayRes.json());
        }

        if (dashboardRes.ok) {
          const dashboardRaw = await dashboardRes.json();
          const metrics = pickReportRows(dashboardRaw);
          const dashboardRoot =
            dashboardRaw && typeof dashboardRaw === "object" && !Array.isArray(dashboardRaw)
              ? (dashboardRaw as Record<string, unknown>)
              : {};

          const revenueFromRoot = asNumber(
            dashboardRoot.total_sales ??
              dashboardRoot.total_revenue ??
              dashboardRoot.today_sales ??
              dashboardRoot.today_revenue ??
              dashboardRoot.gross_revenue ??
              dashboardRoot.revenue,
            0
          );
          const billsFromRoot = asNumber(
            dashboardRoot.total_orders ??
              dashboardRoot.total_bills ??
              dashboardRoot.bills_processed ??
              dashboardRoot.today_orders ??
              dashboardRoot.order_count,
            0
          );
          const collectionRateFromRoot = asNumber(
            dashboardRoot.collection_rate ??
              dashboardRoot.payment_collection_rate ??
              dashboardRoot.collection_percentage ??
              dashboardRoot.collection_percent ??
              dashboardRoot.collection,
            Number.NaN
          );
          const conversionFromRoot = asNumber(
            dashboardRoot.customer_conversion ??
              dashboardRoot.customer_conversion_rate ??
              dashboardRoot.conversion_rate ??
              dashboardRoot.conversion_percentage ??
              dashboardRoot.conversion,
            Number.NaN
          );
          const repeatCustomersFromRoot = asNumber(
            dashboardRoot.repeat_customers ??
              dashboardRoot.repeat_customer_rate ??
              dashboardRoot.repeat_rate ??
              dashboardRoot.repeat_customers_percentage,
            Number.NaN
          );
          const revenueTrendFromRoot = asPercentNumber(
            dashboardRoot.revenue_change_pct ??
              dashboardRoot.revenue_change ??
              dashboardRoot.total_revenue_change_pct ??
              dashboardRoot.total_sales_change_pct,
            0
          );
          const billsTrendFromRoot = asPercentNumber(
            dashboardRoot.orders_change_pct ??
              dashboardRoot.orders_change ??
              dashboardRoot.bills_change_pct ??
              dashboardRoot.total_orders_change_pct,
            0
          );
          const conversionTrendFromRoot = asPercentNumber(
            dashboardRoot.conversion_change_pct ?? dashboardRoot.conversion_change,
            0
          );
          const repeatTrendFromRoot = asPercentNumber(
            dashboardRoot.repeat_customers_change_pct ??
              dashboardRoot.repeat_change_pct ??
              dashboardRoot.repeat_change,
            0
          );

          const metricRevenue = metricValue(
            metrics,
            ["Total Sales", "Total Revenue", "Gross Revenue", "Revenue"],
            revenueFromRoot
          );
          const fallbackRevenue = todayOrders
            .filter(
              (o) =>
                String(o?.payment_status ?? "").toUpperCase() === "PAID" ||
                String(o?.status ?? "").toUpperCase() === "COMPLETED"
            )
            .reduce(
              (sum, o) =>
                sum +
                asNumber(
                  o?.total_amount ?? o?.amount ?? o?.grand_total ?? o?.final_amount,
                  0
                ),
              0
            );
          const revenue = metricRevenue > 0 ? metricRevenue : fallbackRevenue;
          const metricBills = metricValue(
            metrics,
            ["Total Orders", "Total Bills", "Bills Processed", "Orders", "Bill Count"],
            billsFromRoot
          );
          const metricRevenueTrend = metricTrend(
            metrics,
            ["Total Sales", "Total Revenue", "Gross Revenue", "Revenue"],
            revenueTrendFromRoot
          );
          const metricBillsTrend = metricTrend(
            metrics,
            ["Total Orders", "Total Bills", "Bills Processed", "Orders", "Bill Count"],
            billsTrendFromRoot
          );
          const metricConversionTrend = metricTrend(
            metrics,
            ["Conversion Rate", "Customer Conversion", "Conversion"],
            conversionTrendFromRoot
          );
          const metricRepeatTrend = metricTrend(
            metrics,
            ["Repeat Customers", "Repeat Customer Rate", "Repeat Rate"],
            repeatTrendFromRoot
          );
          const bills = metricBills > 0 ? metricBills : todayOrders.length;
          const completed = todayOrders.filter(
            (o) => String(o?.status ?? "").toUpperCase() === "COMPLETED"
          ).length;
          const paid = todayOrders.filter(
            (o) => String(o?.payment_status ?? "").toUpperCase() === "PAID"
          ).length;
          const total = todayOrders.length;

          const conversion = total > 0 ? Math.round((completed / total) * 100) : 0;
          const collectionRate = completed > 0 ? Math.round((paid / completed) * 100) : 0;

          const freq = new Map<string, number>();
          todayOrders.forEach((o) => {
            const name = String(o?.customer_name ?? "").trim();
            if (!name) return;
            freq.set(name, (freq.get(name) ?? 0) + 1);
          });
          const repeatCount = [...freq.values()].filter((c) => c > 1).length;
          const repeatCustomers = freq.size > 0 ? Math.round((repeatCount / freq.size) * 100) : 0;
          const metricCollectionRate = metricValue(
            metrics,
            ["Collection Rate", "Payment Collection Rate", "Collection"],
            collectionRateFromRoot
          );
          const metricConversion = metricValue(
            metrics,
            ["Customer Conversion", "Conversion Rate", "Conversion"],
            conversionFromRoot
          );
          const metricRepeatCustomers = metricValue(
            metrics,
            ["Repeat Customers", "Repeat Customer Rate", "Repeat Rate"],
            repeatCustomersFromRoot
          );

          setTodayTotals({
            revenue,
            bills,
            target: 0,
            collectionRate: Number.isFinite(metricCollectionRate) ? metricCollectionRate : collectionRate,
            conversion: Number.isFinite(metricConversion) ? metricConversion : conversion,
            repeatCustomers: Number.isFinite(metricRepeatCustomers) ? metricRepeatCustomers : repeatCustomers,
            revenueTrend: metricRevenueTrend,
            billsTrend: metricBillsTrend,
            conversionTrend: metricConversionTrend,
            repeatTrend: metricRepeatTrend,
          });
        }

        if (peakRes.ok) {
          const peakRows = pickReportRows(await peakRes.json());
          const trend = peakRows
            .map((r: any) => ({
              slot: String(r?.time_slot_hour ?? r?.hour ?? r?.slot ?? "").trim(),
              revenue: asNumber(r?.revenue ?? r?.sales ?? r?.amount ?? r?.total_amount ?? r?.net_sales, 0),
              bills: asNumber(r?.orders_count ?? r?.orders ?? r?.bills ?? r?.order_count, 0),
            }))
            .filter((row) => row.slot.length > 0);

          const hasUsableTrend = trend.some((row) => row.revenue > 0 || row.bills > 0);
          if (hasUsableTrend) {
            setLiveRevenueTrend(trend);
          } else {
            const byHour = new Map<string, { revenue: number; bills: number }>();
            todayOrders.forEach((order) => {
              const createdAt = String(order?.created_at ?? order?.created ?? "");
              const date = createdAt ? new Date(createdAt) : null;
              if (!date || Number.isNaN(date.getTime())) return;
              const slot = `${String(date.getHours()).padStart(2, "0")}:00`;
              const amount = asNumber(
                order?.total_amount ?? order?.amount ?? order?.grand_total ?? order?.final_amount,
                0
              );
              const prev = byHour.get(slot) ?? { revenue: 0, bills: 0 };
              byHour.set(slot, { revenue: prev.revenue + amount, bills: prev.bills + 1 });
            });

            const fallbackTrend = Array.from(byHour.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([slot, values]) => ({ slot, revenue: values.revenue, bills: values.bills }));
            setLiveRevenueTrend(fallbackTrend);
          }
        } else {
          const byHour = new Map<string, { revenue: number; bills: number }>();
          todayOrders.forEach((order) => {
            const createdAt = String(order?.created_at ?? order?.created ?? "");
            const date = createdAt ? new Date(createdAt) : null;
            if (!date || Number.isNaN(date.getTime())) return;
            const slot = `${String(date.getHours()).padStart(2, "0")}:00`;
            const amount = asNumber(
              order?.total_amount ?? order?.amount ?? order?.grand_total ?? order?.final_amount,
              0
            );
            const prev = byHour.get(slot) ?? { revenue: 0, bills: 0 };
            byHour.set(slot, { revenue: prev.revenue + amount, bills: prev.bills + 1 });
          });
          const fallbackTrend = Array.from(byHour.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([slot, values]) => ({ slot, revenue: values.revenue, bills: values.bills }));
          setLiveRevenueTrend(fallbackTrend);
        }

        {
          const pending = todayOrders.filter((o) =>
            ["NEW", "PENDING"].includes(String(o?.status ?? "").toUpperCase())
          ).length;
          const cooking = todayOrders.filter((o) =>
            ["IN_PROGRESS", "COOKING"].includes(String(o?.status ?? "").toUpperCase())
          ).length;
          const ready = todayOrders.filter((o) =>
            ["READY"].includes(String(o?.status ?? "").toUpperCase())
          ).length;
          const served = todayOrders.filter((o) =>
            ["COMPLETED", "SERVED"].includes(String(o?.status ?? "").toUpperCase())
          ).length;

          setLiveQueueBoard([
            { label: "Pending", variant: "pending", count: pending },
            { label: "Cooking", variant: "cooking", count: cooking },
            { label: "Ready", variant: "ready", count: ready },
            { label: "Served", variant: "served", count: served },
          ]);
        }

        if (recentRes.ok) {
          const recentPayload = await recentRes.json();
          const recentApiRows = asArray(recentPayload).slice(0, 10);
          const todaySorted = [...todayOrders]
            .sort((a, b) => {
              const aTs = new Date(String(a?.created_at ?? 0)).getTime();
              const bTs = new Date(String(b?.created_at ?? 0)).getTime();
              return bTs - aTs;
            })
            .slice(0, 10);
          // /orders/recent/ is staff-filtered in backend, while queue/today cards use full today orders.
          // Prefer broader today list when it contains more records so dashboard sections stay consistent.
          setRecentOrders(todaySorted.length > recentApiRows.length ? todaySorted : recentApiRows);
        }

        if (tablesRes.ok) {
          const tablesPayload = await tablesRes.json();
          const tablesList = asArray(tablesPayload);
          const available = tablesList.filter(
            (table: any) => String(table?.status ?? "").toLowerCase() === "available"
          ).length;
          setOpenTablesCount(available);
        }

        if (meRes.ok) {
          const mePayload = await meRes.json();
          const name = String(mePayload?.name ?? mePayload?.full_name ?? mePayload?.username ?? "Staff");
          setStaffName(name);
        }

        if (permissionsRes.ok) {
          const permsPayload = await permissionsRes.json();
          const permissions = asArray(permsPayload?.permissions).length
            ? asArray(permsPayload?.permissions)
            : asArray(permsPayload);

          const blocked = permissions.some((p: any) =>
            String(typeof p === "string" ? p : p?.code ?? p?.name ?? "")
              .toLowerCase()
              .includes("deny_takeaway")
          );
          setCanTakeaway(!blocked);
        }

        if (paymentRes.ok) {
          const payRows = pickReportRows(await paymentRes.json());
          const hasMethodBreakdown = payRows.some(
            (r) => r?.cash_total !== undefined || r?.upi_total !== undefined || r?.card_total !== undefined
          );

          if (hasMethodBreakdown) {
            const cash = payRows.reduce((sum, r) => sum + asNumber(r?.cash_total, 0), 0);
            const upi = payRows.reduce((sum, r) => sum + asNumber(r?.upi_total, 0), 0);
            const card = payRows.reduce((sum, r) => sum + asNumber(r?.card_total, 0), 0);
            const methodTotals = [
              { name: "CASH", amount: cash },
              { name: "UPI", amount: upi },
              { name: "CARD", amount: card },
            ].filter((x) => x.amount > 0);
            const total = methodTotals.reduce((sum, x) => sum + x.amount, 0);
            const mix = methodTotals.map((x, i) => ({
              name: x.name,
              value: total > 0 ? Math.round((x.amount / total) * 100) : 0,
              color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
            }));
            setLivePaymentMix(mix);
          } else {
            const totalAmount = payRows.reduce(
              (s, r) =>
                s +
                asNumber(
                  r?.amount ??
                    r?.total_amount ??
                    r?.net_received ??
                    r?.value ??
                    r?.transactions,
                  0
                ),
              0
            );
            const mix = payRows
              .map((r: any, i: number) => {
                const amount = asNumber(
                  r?.amount ??
                    r?.total_amount ??
                    r?.net_received ??
                    r?.value ??
                    r?.transactions,
                  0
                );
                const value =
                  totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : asNumber(r?.transactions, 0);
                return {
                  name: String(r?.method ?? r?.payment_method ?? r?.name ?? `Method ${i + 1}`),
                  value,
                  color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
                };
              })
              .filter((x) => x.value > 0);
            setLivePaymentMix(mix);
          }
        } else {
          setLivePaymentMix([]);
        }
      } catch (error) {
        console.error("Dashboard load failed:", error);
      }
    };

    loadDashboard();
  }, []);

  const summary = useMemo(() => {
    const revenue = todayTotals.revenue || liveRevenueTrend.reduce((sum, row) => sum + row.revenue, 0);
    const bills = todayTotals.bills || liveRevenueTrend.reduce((sum, row) => sum + row.bills, 0);
    const activeQueue = liveQueueBoard[0].count + liveQueueBoard[1].count;
    const avgBill = bills > 0 ? Math.round(revenue / bills) : 0;
    const target = todayTotals.target;
    const targetProgress = target > 0 ? Math.min(Math.round((revenue / target) * 100), 100) : 0;

    return {
      revenue,
      bills,
      activeQueue,
      avgBill,
      target,
      targetProgress,
      conversion: todayTotals.conversion,
      repeatCustomers: todayTotals.repeatCustomers,
      collectionRate: todayTotals.collectionRate,
    };
  }, [liveQueueBoard, liveRevenueTrend, todayTotals]);

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
        <div
          className="absolute inset-0 bg-no-repeat bg-center bg-[length:100%_100%]"
          style={{
            backgroundImage:
              "linear-gradient(160deg,rgba(2,6,23,0.46),rgba(30,41,59,0.42)), url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=2200&q=80')",
          }}
        />
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/90">
                <CalendarDays className="h-3.5 w-3.5" />
                Welcome, {staffName}
              </p>
              <h1 className="mt-3 text-2xl font-bold text-white md:text-3xl">Staff Business Command Center</h1>
              <p className="mt-1 text-sm text-white/75">
                Billing performance, customer growth, and live service execution in one dashboard.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-white md:grid-cols-4">
            <div>
              <p className="text-xs text-white/70">Gross Revenue</p>
              <p className="text-xl font-semibold">Rs.{summary.revenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Bills Processed</p>
              <p className="text-xl font-semibold">{summary.bills}</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Collection Rate</p>
              <p className="text-xl font-semibold">{summary.collectionRate}%</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Avg Bill Value</p>
              <p className="text-xl font-semibold">Rs.{summary.avgBill}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value={`Rs.${summary.revenue.toLocaleString()}`}
          subtitle="Compared to yesterday"
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
        <KPICard
          title="Total Bills"
          value={summary.bills}
          subtitle="All billing channels"
          icon={<ReceiptText className="h-4 w-4" />}
        />
        <KPICard
          title="Customer Conversion"
          value={`${summary.conversion}%`}
          subtitle="Walk-in to paid bills"
          icon={<Target className="h-4 w-4" />}
        />
        <KPICard
          title="Repeat Customers"
          value={`${summary.repeatCustomers}%`}
          subtitle="Retention this week"
          icon={<UserPlus className="h-4 w-4" />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Revenue and Billing Trend</h3>
              <p className="text-xs text-muted-foreground">Monitor billing momentum through business hours.</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <TrendingUp className="h-3.5 w-3.5" />
              On track
            </span>
          </div>

          <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={liveRevenueTrend}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.38} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="slot" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="url(#revFill)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Revenue target: Rs.{summary.target.toLocaleString()}</span>
              <span className="font-semibold text-foreground">{summary.targetProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${summary.targetProgress}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-base font-semibold text-foreground">Payment Mix</h3>
          <p className="mt-1 text-xs text-muted-foreground">Channel-wise billing contribution</p>

          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={livePaymentMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3}>
                {livePaymentMix.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2">
            {livePaymentMix.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="ml-auto font-semibold text-foreground">{item.value}%</span>
              </div>
            ))}
            {livePaymentMix.length === 0 && (
              <p className="text-xs text-muted-foreground">No payment split data for today.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Recent Orders</h3>
            <Megaphone className="h-4 w-4 text-primary" />
          </div>

          <div className="space-y-3">
            {recentOrders.map((item: any, index: number) => (
              <div key={String(item?.id ?? `recent-${index}`)} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    #{String(item?.order_id ?? item?.bill_number ?? item?.id ?? "-")}
                  </p>
                  <StatusBadge
                    variant={
                      String(item?.status ?? "").toLowerCase() === "ready"
                        ? "ready"
                        : String(item?.status ?? "").toLowerCase() === "served" ||
                          String(item?.status ?? "").toLowerCase() === "completed"
                        ? "served"
                        : String(item?.status ?? "").toLowerCase() === "cooking" ||
                          String(item?.status ?? "").toLowerCase() === "in_progress"
                        ? "cooking"
                        : "pending"
                    }
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {String(item?.order_type ?? "ORDER")} - {String(item?.customer_name ?? "Walk-in")}
                </p>
                <p className="mt-2 text-sm font-semibold text-success">
                  Rs {asNumber(item?.total_amount ?? item?.total ?? item?.grand_total ?? item?.amount).toFixed(0)}
                </p>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <p className="text-xs text-muted-foreground">No recent orders.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-base font-semibold text-foreground">Queue Health</h3>
          <p className="mt-1 text-xs text-muted-foreground">Live service execution board</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {liveQueueBoard.map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <StatusBadge variant={item.variant} />
                </div>
                <p className="mt-2 text-2xl font-bold text-foreground">{item.count}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background p-3">
            <span className="text-sm text-muted-foreground">Current Staff</span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4" />
              {staffName}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-base font-semibold text-foreground">Quick Operations</h3>
          <p className="mt-1 text-xs text-muted-foreground">Move between billing workflows faster</p>

          <div className="mt-4 space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition hover:bg-accent"
              >
                <span>
                  {action.path === "/staff/tables" && openTablesCount !== null
                    ? `${action.label} (${openTablesCount})`
                    : action.label}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate("/staff/orders")}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <CreditCard className="h-4 w-4" />
            Go to Billing Desk
          </button>
        </div>
      </section>

      {showTakeawayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="mb-1 text-xl font-semibold text-foreground">Take Away Order</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Add customer details before opening POS.
            </p>

            <input
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setTakeawayError("");
              }}
              className="mb-3 w-full rounded-xl border border-input bg-background px-4 py-2.5 outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setTakeawayError("");
              }}
              className="mb-5 w-full rounded-xl border border-input bg-background px-4 py-2.5 outline-none focus:ring-2 focus:ring-ring"
            />
            {takeawayError && (
              <p className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
                {takeawayError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTakeawayModal(false);
                  setTakeawayError("");
                }}
                disabled={creatingTakeaway}
                className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("access");
                    if (!token) {
                      setTakeawayError("Missing access token. Please login again.");
                      return;
                    }
                    const cleanName = customerName.trim();
                    const cleanPhone = phone.replace(/\D/g, "").trim();
                    if (!cleanName) {
                      setTakeawayError("Enter customer name.");
                      return;
                    }
                    if (!cleanPhone || cleanPhone.length < 10) {
                      setTakeawayError("Enter a valid mobile number.");
                      return;
                    }

                    setCreatingTakeaway(true);
                    setTakeawayError("");

                    const response = await fetch(`${BASE_URL}/api/orders/create/`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        order_type: "TAKEAWAY",
                        customer_name: cleanName,
                        customer_phone: cleanPhone,
                      }),
                    });

                    if (!response.ok) {
                      const err = await response.json().catch(() => ({}));
                      throw new Error(String(err?.detail ?? err?.error ?? `Order creation failed (HTTP ${response.status})`));
                    }

                    const data = await response.json();
                    const orderId = String(data?.id ?? data?.order_id ?? data?.order?.id ?? "");
                    if (!orderId) {
                      throw new Error("Order id missing in response");
                    }
                    setShowTakeawayModal(false);
                    setCustomerName("");
                    setPhone("");
                    navigate(`/staff/pos?order=${orderId}`);
                  } catch (error) {
                    console.error(error);
                    setTakeawayError(error instanceof Error ? error.message : "Error creating order");
                  } finally {
                    setCreatingTakeaway(false);
                  }
                }}
                disabled={creatingTakeaway}
                className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {creatingTakeaway && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                )}
                {creatingTakeaway ? "Creating..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;




