import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ShoppingBag, Users, DollarSign, type LucideIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import dashboardBanner from "@/assets/dashboard-banner.jpg";

const API_BASE = "http://192.168.1.18:8000";
type Period = "weekly" | "monthly";
type JsonRecord = Record<string, unknown>;

interface RevenuePoint {
  name: string;
  revenue: number;
  orders: number;
}

interface PaymentPoint {
  name: string;
  value: number;
  color: string;
}

interface CategoryPoint {
  name: string;
  sales: number;
}

interface StatPoint {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  trend: "up" | "neutral";
}

interface TopDish {
  name: string;
  sold: number;
  image: string;
}

interface RecentOrder {
  id: string;
  customer: string;
  items: number;
  amount: string;
  type: string;
  status: string;
}

const paymentColors = [
  "hsl(252, 75%, 60%)",
  "hsl(252, 65%, 75%)",
  "hsl(200, 80%, 55%)",
  "hsl(160, 70%, 45%)",
  "hsl(30, 90%, 55%)",
];

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};

const asList = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.map((x) => asRecord(x)) : [];

const pickList = (raw: unknown): JsonRecord[] => {
  if (Array.isArray(raw)) return asList(raw);
  const wrapper = asRecord(raw);
  return asList(wrapper.data).length > 0 ? asList(wrapper.data) : asList(wrapper.results);
};

const toNum = (value: unknown) => {
  const parsed =
    typeof value === "string"
      ? Number(value.replace(/[^0-9.-]/g, ""))
      : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickMetricValue = (rows: JsonRecord[], names: string[], fallback = 0) => {
  const normalized = names.map((name) => name.trim().toLowerCase());
  const row = rows.find((item) => {
    const key = String(item.metric ?? item.name ?? item.label ?? item.title ?? "")
      .trim()
      .toLowerCase();
    return normalized.includes(key);
  });
  return toNum(row?.value ?? row?.amount ?? row?.count ?? row?.total ?? fallback);
};

const formatPercent = (value: unknown, fallback = "+0%") => {
  if (value === null || value === undefined || value === "") return fallback;
  const n = toNum(value);
  if (!Number.isFinite(n)) return fallback;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}%`;
};

const pickMetricChange = (rows: JsonRecord[], names: string[], fallback = "+0%") => {
  const normalized = names.map((name) => name.trim().toLowerCase());
  const row = rows.find((item) => {
    const key = String(item.metric ?? item.name ?? item.label ?? item.title ?? "")
      .trim()
      .toLowerCase();
    return normalized.includes(key);
  });
  return formatPercent(
    row?.change_pct ??
      row?.change_percent ??
      row?.change ??
      row?.trend_pct ??
      row?.trend,
    fallback
  );
};

const money = (value: number) => `Rs. ${value.toLocaleString()}`;

const pretty = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const AdminDashboard = () => {
  const [period, setPeriod] = useState<Period>("weekly");
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    revenue: 0,
    orders: 0,
    staff: 0,
    avgOrder: 0,
    revenueChange: "+0%",
    orderChange: "+0%",
    aovChange: "+0%",
  });
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryPoint[]>([]);
  const [topDishes, setTopDishes] = useState<TopDish[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const [summaryRes, weeklyRevenueRes, monthlyRevenueRes, paymentRes, productWiseRes, ordersRes, staffRes] = await Promise.all([
          fetch(`${API_BASE}/api/reports/dashboard/`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/reports/sales/daily/?period=weekly`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/reports/sales/daily/?period=monthly`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/reports/payments/method/`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/reports/sales/product/`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/orders/recent/?limit=10`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/accounts/staff/`, { headers: getAuthHeaders() }),
        ]);

        let fallbackActiveStaff = 0;
        if (staffRes.ok) {
          const raw = await staffRes.json();
          const list = Array.isArray(raw) ? asList(raw) : asList(asRecord(raw).results);
          fallbackActiveStaff = list.filter((x) => {
            if (x.is_active !== undefined) return Boolean(x.is_active);
            const status = String(x.status ?? "").toUpperCase();
            return status === "ACTIVE";
          }).length;
        }

        if (summaryRes.ok) {
          const raw = await summaryRes.json();
          const root = asRecord(raw);
          const dataRoot = asRecord(root.data);
          const metricList = Array.isArray(raw)
            ? asList(raw)
            : asList(root.summary).length > 0
            ? asList(root.summary)
            : asList(root.data).length > 0
            ? asList(root.data)
            : [];
          const metricMap =
            metricList.length > 0
              ? metricList.reduce<Record<string, unknown>>((acc, x) => {
                  const key = String(x.metric ?? "").trim().toLowerCase();
                  if (key) acc[key] = x.value;
                  return acc;
                }, {})
              : null;

          if (metricMap) {
            const revenue = pickMetricValue(
              metricList,
              ["Total Sales", "Total Revenue", "Gross Revenue", "Revenue"],
              toNum(metricMap["total sales"] ?? metricMap["total revenue"] ?? metricMap["gross revenue"])
            );
            const orders = pickMetricValue(
              metricList,
              ["Total Orders", "Total Bills", "Bills Processed", "Orders", "Bill Count"],
              toNum(metricMap["total orders"] ?? metricMap["total bills"] ?? metricMap["bills processed"])
            );
            const staff = pickMetricValue(
              metricList,
              ["Active Staff", "Staff On Duty", "Staff Count"],
              toNum(metricMap["active staff"] ?? fallbackActiveStaff)
            );
            const avgOrderRaw = pickMetricValue(
              metricList,
              ["Average Order Value", "Avg Order Value", "AOV"],
              toNum(metricMap["average order value"])
            );
            const avgOrder = avgOrderRaw > 0 ? avgOrderRaw : orders > 0 ? revenue / orders : 0;
            const revenueChange = pickMetricChange(
              metricList,
              ["Total Sales", "Total Revenue", "Gross Revenue", "Revenue"],
              formatPercent(
                root.revenue_change_pct ??
                  root.revenue_change ??
                  dataRoot.revenue_change_pct ??
                  dataRoot.revenue_change,
                "+0%"
              )
            );
            const orderChange = pickMetricChange(
              metricList,
              ["Total Orders", "Total Bills", "Bills Processed", "Orders", "Bill Count"],
              formatPercent(
                root.orders_change_pct ??
                  root.orders_change ??
                  root.bills_change_pct ??
                  root.bills_change ??
                  dataRoot.orders_change_pct ??
                  dataRoot.orders_change ??
                  dataRoot.bills_change_pct ??
                  dataRoot.bills_change,
                "+0%"
              )
            );
            const aovChange = pickMetricChange(
              metricList,
              ["Average Order Value", "Avg Order Value", "AOV"],
              formatPercent(
                root.aov_change_pct ??
                  root.aov_change ??
                  dataRoot.aov_change_pct ??
                  dataRoot.aov_change,
                "+0%"
              )
            );
            setSummary((prev) => ({
              revenue,
              orders,
              staff,
              avgOrder,
              revenueChange,
              orderChange,
              aovChange,
            }));
          } else {
          const root = asRecord(raw);
          const nested = asRecord(root.data);
          const listItem = asRecord(Array.isArray(raw) ? raw[0] : undefined);
          const resultsItem = asRecord(Array.isArray(root.results) ? root.results[0] : undefined);
          const s = Object.keys(nested).length
            ? nested
            : Object.keys(listItem).length
            ? listItem
            : Object.keys(resultsItem).length
            ? resultsItem
            : root;

          const revenue = toNum(s.today_revenue ?? s.todays_revenue ?? s.today_sales ?? s.total_revenue ?? s.total_sales ?? s.revenue);
          const orders = toNum(s.total_orders ?? s.orders_count ?? s.today_orders ?? s.todays_orders ?? s.order_count);
          const staff = toNum(s.active_staff ?? s.staff_on_duty ?? s.staff_count ?? fallbackActiveStaff);
          const avgOrder = toNum(s.avg_order_value ?? s.average_order_value ?? s.aov ?? s.avg_ticket_size ?? (orders > 0 ? revenue / orders : 0));
          const hasKnownSummaryField =
            s.today_revenue !== undefined ||
            s.todays_revenue !== undefined ||
            s.today_sales !== undefined ||
            s.total_revenue !== undefined ||
            s.total_sales !== undefined ||
            s.revenue !== undefined ||
            s.total_orders !== undefined ||
            s.orders_count !== undefined ||
            s.today_orders !== undefined ||
            s.todays_orders !== undefined ||
            s.order_count !== undefined ||
            s.active_staff !== undefined ||
            s.staff_on_duty !== undefined ||
            s.staff_count !== undefined ||
            s.avg_order_value !== undefined ||
            s.average_order_value !== undefined ||
            s.aov !== undefined ||
            s.avg_ticket_size !== undefined;

          if (hasKnownSummaryField) {
            setSummary({
              revenue,
              orders,
              staff,
              avgOrder,
              revenueChange: String(s.revenue_change_pct ?? s.revenue_change ?? "+0%"),
              orderChange: String(s.orders_change_pct ?? s.orders_change ?? "+0%"),
              aovChange: String(s.aov_change_pct ?? s.aov_change ?? "+0%"),
            });
          }
          }
        }

        const mapRevenue = (raw: unknown): RevenuePoint[] => {
          const wrapper = asRecord(raw);
          const list = Array.isArray(raw) ? asList(raw) : asList(wrapper.data);
          return list
            .map((x) => ({
              name: String(
                x.name ??
                  x.day ??
                  x.weekday ??
                  (x.date ? new Date(String(x.date)).toLocaleDateString("en-US", { weekday: "short" }) : "")
              ),
              revenue: toNum(x.revenue ?? x.total_sales ?? x.total_amount ?? x.amount ?? x.sales),
              orders: toNum(x.orders ?? x.total_orders ?? x.orders_count ?? x.order_count ?? x.orderCount),
            }))
            .filter((x) => x.name);
        };

        let weeklyRevenueData: RevenuePoint[] = [];
        let monthlyRevenueData: RevenuePoint[] = [];

        if (weeklyRevenueRes.ok) {
          const raw = await weeklyRevenueRes.json();
          weeklyRevenueData = mapRevenue(raw);
        }

        if (monthlyRevenueRes.ok) {
          const raw = await monthlyRevenueRes.json();
          monthlyRevenueData = mapRevenue(raw);
        }

        const selectedRevenueData = period === "weekly" ? weeklyRevenueData : monthlyRevenueData;
        if (selectedRevenueData.length > 0) setRevenueData(selectedRevenueData);

        if (paymentRes.ok) {
          const raw = await paymentRes.json();
          const wrapper = asRecord(raw);
          const list = Array.isArray(raw) ? asList(raw) : asList(wrapper.data);
          const hasMethodBreakdown = list.some(
            (x) => x.cash_total !== undefined || x.upi_total !== undefined || x.card_total !== undefined
          );

          let mapped: PaymentPoint[] = [];
          if (hasMethodBreakdown) {
            const cash = list.reduce((sum, row) => sum + toNum(row.cash_total), 0);
            const upi = list.reduce((sum, row) => sum + toNum(row.upi_total), 0);
            const card = list.reduce((sum, row) => sum + toNum(row.card_total), 0);
            const methodTotals = [
              { name: "CASH", amount: cash },
              { name: "UPI", amount: upi },
              { name: "CARD", amount: card },
            ].filter((x) => x.amount > 0);
            const total = methodTotals.reduce((sum, x) => sum + x.amount, 0);
            mapped = methodTotals.map((x, i) => ({
              name: x.name,
              value: total > 0 ? Number(((x.amount / total) * 100).toFixed(1)) : 0,
              color: paymentColors[i % paymentColors.length],
            }));
          } else {
            const values = list.map((x) =>
              toNum(
                x.percent ??
                  x.percentage ??
                  x.value ??
                  x.amount ??
                  x.total_amount ??
                  x.total ??
                  x.net_received ??
                  x.order_count
              )
            );
            const sum = values.reduce((acc, v) => acc + v, 0);
            const hasPct = list.some((x) => x.percent !== undefined || x.percentage !== undefined);
            mapped = list.map((x, i) => ({
              name: String(x.name ?? x.method ?? x.payment_method ?? x.date ?? "Unknown"),
              value: hasPct ? values[i] : sum > 0 ? Number(((values[i] / sum) * 100).toFixed(1)) : 0,
              color: paymentColors[i % paymentColors.length],
            }));
          }
          if (mapped.length > 0) setPaymentData(mapped);
        }

        if (productWiseRes.ok) {
          const raw = await productWiseRes.json();
          const list = pickList(raw);

          const topDishMapped = list.slice(0, 5).map((x, i) => ({
            name: String(x.product_name ?? x.name ?? "Product"),
            sold: toNum(x.quantity_sold ?? x.sold ?? x.count ?? x.total_quantity ?? x.total_sold ?? x.orders_count),
            image: String(x.image_url ?? x.image ?? x.photo ?? x.thumbnail ?? ""),
          }));
          if (topDishMapped.length > 0) setTopDishes(topDishMapped);

          const categoryAgg = list.reduce<Record<string, number>>((acc, x) => {
            const categoryName = String(x.category ?? x.category_name ?? "Other");
            const sales = toNum(
              x.total_revenue ?? x.net_revenue ?? x.sales_amount ?? x.total_amount ?? x.total_sales ?? x.sales ?? x.revenue
            );
            acc[categoryName] = (acc[categoryName] ?? 0) + sales;
            return acc;
          }, {});

          const categoryMapped = Object.entries(categoryAgg)
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 6);
          if (categoryMapped.length > 0) setCategoryData(categoryMapped);
        }

        if (ordersRes.ok) {
          const raw = await ordersRes.json();
          const list = pickList(raw);
          const mapped = list.slice(0, 10).map((x) => ({
            id: `#${String(x.bill_number ?? x.order_id ?? "ORDER")}`,
            customer: String(x.customer_name ?? x.table_name ?? "Walk-in"),
            items: toNum(x.items_count ?? x.items),
            amount: money(toNum(x.total_amount ?? x.amount ?? x.grand_total)),
            type: pretty(String(x.order_type ?? (x.table_name ? "dine_in" : "takeaway"))),
            status: pretty(String(x.status ?? x.payment_status ?? "Pending")),
          }));
          if (mapped.length > 0) setRecentOrders(mapped);
        }
      } catch (error) {
        console.error("Dashboard load failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, [period]);

  const stats = useMemo<StatPoint[]>(
    () => [
      { label: "Today's Revenue", value: money(summary.revenue), change: summary.revenueChange, icon: DollarSign, trend: "up" },
      { label: "Total Orders", value: String(summary.orders), change: summary.orderChange, icon: ShoppingBag, trend: "up" },
      { label: "Active Staff", value: String(summary.staff), change: "On Duty", icon: Users, trend: "neutral" },
      { label: "Avg. Order Value", value: money(summary.avgOrder), change: summary.aovChange, icon: TrendingUp, trend: "up" },
    ],
    [summary]
  );

  const hasLoadedData =
    revenueData.length > 0 ||
    paymentData.length > 0 ||
    categoryData.length > 0 ||
    topDishes.length > 0 ||
    recentOrders.length > 0;

  if (isLoading && !hasLoadedData) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 shadow-xl">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
          <p className="text-sm font-medium text-slate-800">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden mb-8 h-48"
      >
        <img src={dashboardBanner} alt="Cafe overview" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/40 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground">Good Morning! Cafe</h1>
            <p className="text-primary-foreground/80 text-sm mt-1">Here's what's happening at your cafe today</p>
            <div className="flex gap-6 mt-4">
              <div>
                <p className="text-xs text-primary-foreground/60">Revenue</p>
                <p className="text-lg font-bold text-primary-foreground">{money(summary.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-primary-foreground/60">Orders</p>
                <p className="text-lg font-bold text-primary-foreground">{summary.orders}</p>
              </div>
              <div>
                <p className="text-xs text-primary-foreground/60">Staff</p>
                <p className="text-lg font-bold text-primary-foreground">{summary.staff}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div key={i} variants={item} className="glass-card p-5 hover:shadow-glow transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-2">{stat.value}</p>
                <span className={`text-xs font-medium mt-1 inline-block ${stat.trend === "up" ? "text-success" : "text-muted-foreground"}`}>
                  {stat.change}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow opacity-80 group-hover:opacity-100 transition-opacity">
                <stat.icon className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts + Top Dishes Row */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        {/* Revenue Chart */}
        <motion.div variants={item} className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Revenue Overview</h3>
              <p className="text-xs text-muted-foreground mt-0.5">This week's earnings</p>
            </div>
            <div className="flex gap-1 p-1 bg-secondary rounded-full">
              <button
                onClick={() => setPeriod("weekly")}
                className={`px-3 py-1 text-xs font-medium rounded-full ${period === "weekly" ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriod("monthly")}
                className={`px-3 py-1 text-xs font-medium rounded-full ${period === "monthly" ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Monthly
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(252, 20%, 92%)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(250, 10%, 50%)" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(250, 10%, 50%)" }} tickFormatter={(v) => `Rs.${Math.round(v / 1000)}K`} />
              <Tooltip
                contentStyle={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", border: "1px solid hsl(252, 20%, 90%)", borderRadius: "12px", boxShadow: "0 4px 24px hsl(252 75% 60% / 0.1)" }}
                formatter={(value: number) => [money(value), "Revenue"]}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(252, 75%, 60%)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Payment Split Pie */}
        <motion.div variants={item} className="glass-card p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Payment Split</h3>
          <p className="text-xs text-muted-foreground mb-4">By payment mode</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={paymentData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={4} dataKey="value">
                {paymentData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}%`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-2">
            {paymentData.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="text-muted-foreground">{p.name}</span>
                <span className="font-semibold text-foreground ml-auto">{p.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Dishes */}
        <motion.div variants={item} className="glass-card p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Top Dishes</h3>
          <p className="text-xs text-muted-foreground mb-4">Best sellers today</p>
          <div className="space-y-3">
            {topDishes.map((dish, i) => (
              <div key={i} className="flex items-center gap-3">
                {dish.image ? (
                  <img src={dish.image} alt={dish.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{dish.name}</p>
                  <p className="text-xs text-muted-foreground">{dish.sold} sold</p>
                </div>
                <span className="text-xs font-semibold gradient-primary-text">#{i + 1}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Row */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Sales */}
        <motion.div variants={item} className="glass-card p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Category Sales</h3>
          <p className="text-xs text-muted-foreground mb-4">Today's breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(252, 20%, 92%)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(250, 10%, 50%)" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(250, 10%, 50%)" }} tickFormatter={(v) => `Rs.${Math.round(v / 1000)}K`} />
              <Tooltip formatter={(value: number) => [money(value)]} />
              <Bar dataKey="sales" fill="hsl(252, 75%, 60%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Orders */}
        <motion.div variants={item} className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Recent Orders</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Latest transactions</p>
            </div>
            <button className="text-xs font-medium text-primary hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="pb-3 font-medium">Order</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Items</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-semibold text-foreground">{order.id}</td>
                    <td className="py-3 text-muted-foreground">{order.customer}</td>
                    <td className="py-3 text-muted-foreground">{order.items}</td>
                    <td className="py-3 font-semibold text-foreground">{order.amount}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${order.type === "Dine In" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>{order.type}</span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        order.status === "Served" ? "bg-success/10 text-success" :
                        order.status === "Ready" ? "bg-info/10 text-info" :
                        order.status === "Cooking" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>{order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;


