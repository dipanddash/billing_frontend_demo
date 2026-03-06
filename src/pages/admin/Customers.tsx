import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  Activity,
  Wallet,
  Trophy,
  X,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";

/* ================= CONFIG ================= */

const API_BASE = "https://demo-j5fde.ondigitalocean.app";

/* ================= TYPES ================= */

interface Customer {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  visit_count?: number;
  order_count?: number;
  total_spent?: number;
  last_visit_at?: string;
  avg_order_value?: number;
  favorite_order_type?: string;
}

/* ================= HELPERS ================= */

const formatDate = (v?: string) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
};

const money = (v?: number) => `Rs. ${(v ?? 0).toLocaleString()}`;

const monthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short" });

/* ================= MAIN ================= */

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Customer | null>(null);

  /* ================= AUTH ================= */

  const headers = () => {
    const token = localStorage.getItem("access");
    return token
      ? { Authorization: `Bearer ${token}` }
      : {};
  };

  /* ================= LOAD ================= */

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/accounts/customers/`,
        {
          headers: {
            "Content-Type": "application/json",
            ...headers(),
          },
        }
      );

      if (!res.ok) throw new Error("Fetch failed");

      const data = await res.json();

      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTER ================= */

  const filtered = useMemo(() => {
    const t = search.toLowerCase();

    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(t) ||
        c.phone?.includes(t) ||
        c.id?.includes(t)
    );
  }, [customers, search]);

  /* ================= ANALYTICS ================= */

  const active = useMemo(
    () =>
      customers.filter(
        (c) =>
          (c.order_count ?? 0) > 0 ||
          (c.visit_count ?? 0) > 0
      ).length,
    [customers]
  );

  const revenue = useMemo(
    () =>
      customers.reduce(
        (s, c) => s + (c.total_spent ?? 0),
        0
      ),
    [customers]
  );

  const avgValue = useMemo(
    () =>
      customers.length
        ? revenue / customers.length
        : 0,
    [customers, revenue]
  );

  const frequent = useMemo(
    () =>
      [...customers]
        .sort(
          (a, b) =>
            (b.order_count ?? 0) -
            (a.order_count ?? 0)
        )
        .slice(0, 6)
        .map((c) => ({
          name: c.name,
          orders: c.order_count ?? 0,
        })),
    [customers]
  );

  const growth = useMemo(() => {
    const now = new Date();
    const res: any[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const count = customers.filter((c) => {
        const cd = new Date(c.created_at);
        return (
          cd.getMonth() === d.getMonth() &&
          cd.getFullYear() === d.getFullYear()
        );
      }).length;

      res.push({
        month: monthLabel(d),
        customers: count,
      });
    }

    return res;
  }, [customers]);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="p-10 text-sm text-slate-600">
        Loading customers...
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="relative min-h-screen space-y-8 overflow-hidden bg-[linear-gradient(180deg,#f8f7ff_0%,#f3f4f9_48%,#f8fafc_100%)] p-6">
      <div className="pointer-events-none absolute -left-20 top-8 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-20 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />

      {/* ================= HEADER ================= */}

      <div className="relative overflow-hidden rounded-3xl border border-violet-200/80 bg-[linear-gradient(130deg,#ffffff_0%,#f7f3ff_46%,#efe9ff_100%)] p-7 shadow-[0_20px_50px_rgba(76,29,149,0.14)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_22%,rgba(255,255,255,0.2),transparent_34%),radial-gradient(circle_at_84%_26%,rgba(255,255,255,0.12),transparent_30%)]" />

        <h1 className="text-2xl font-bold text-slate-900">
          Customer Management
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Loyalty | Spending | Analytics
        </p>

        <div className="mt-4 flex flex-wrap gap-2">

          <Badge>{customers.length} Customers</Badge>
          <Badge>{active} Active</Badge>
          <Badge>{money(revenue)} Revenue</Badge>
          <Badge>Avg {money(avgValue)}</Badge>

        </div>
      </div>

      {/* ================= KPI ================= */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <KPI
          label="Customers"
          value={customers.length}
          icon={<Users />}
        />

        <KPI
          label="Active"
          value={active}
          icon={<Activity />}
        />

        <KPI
          label="Revenue"
          value={money(revenue)}
          icon={<Wallet />}
        />

        <KPI
          label="Avg Value"
          value={money(avgValue)}
          icon={<Trophy />}
        />

      </div>

      {/* ================= CHARTS ================= */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <ChartCard title="Top Customers">

          <ResponsiveContainer>
            <BarChart data={frequent}>
              <CartesianGrid opacity={0.2} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="orders"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

        </ChartCard>

        <ChartCard title="Customer Growth">

          <ResponsiveContainer>
            <AreaChart data={growth}>

              <defs>
                <linearGradient
                  id="grad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#6366f1"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="#6366f1"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid opacity={0.2} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />

              <Area
                dataKey="customers"
                stroke="#6366f1"
                fill="url(#grad)"
                strokeWidth={2}
              />

            </AreaChart>
          </ResponsiveContainer>

        </ChartCard>

      </div>

      {/* ================= TABLE ================= */}

      <div className="overflow-hidden rounded-2xl border border-violet-200/70 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.08)]">

        {/* TABLE HEADER */}

        <div className="flex items-center justify-between border-b border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8f7ff_100%)] p-4">

          <h2 className="font-semibold text-slate-800">
            Customers List
          </h2>

          <div className="relative w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search customer..."
              className="w-full rounded-xl border border-violet-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-300/40"
            />

          </div>

        </div>

        {/* TABLE */}

        <table className="w-full text-sm">

          <thead className="bg-violet-50 text-violet-700">

            <tr>

              {[
                "Customer Name",
                "Phone",
                "Joined",
                "Orders",
                "Visits",
                "Total Spent",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}

            </tr>

          </thead>

          <tbody className="divide-y divide-violet-50">

            {filtered.map((c) => (

              <tr
                key={c.id}
                onClick={() => setSelected(c)}
                className="cursor-pointer transition hover:bg-violet-50/65"
              >

                <td className="px-4 py-3 font-medium text-slate-800">
                  {c.name || "Unknown"}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {c.phone}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {formatDate(c.created_at)}
                </td>

                <td className="px-4 py-3">
                  {c.order_count ?? 0}
                </td>

                <td className="px-4 py-3">
                  {c.visit_count ?? 0}
                </td>

                <td className="px-4 py-3 font-semibold text-violet-700">
                  {money(c.total_spent)}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* ================= MODAL ================= */}

      {selected && (
        <CustomerModal
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}

    </div>
  );
};

export default Customers;

/* ================= COMPONENTS ================= */

const Badge = ({ children }: any) => (
  <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700">
    {children}
  </span>
);

const KPI = ({ label, value, icon }: any) => (
  <div className="rounded-2xl border border-violet-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] p-4 shadow-[0_12px_26px_rgba(79,70,229,0.1)]">

    <div className="flex justify-between items-center">

      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-500">
        {label}
      </p>

      <div className="text-violet-600">
        {icon}
      </div>

    </div>

    <p className="mt-2 text-2xl font-bold text-slate-900">
      {value}
    </p>

  </div>
);

const ChartCard = ({
  title,
  children,
}: any) => (
  <div className="rounded-2xl border border-violet-200/70 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)]">

    <p className="text-sm font-semibold text-slate-700 mb-3">
      {title}
    </p>

    <div className="h-[260px]">
      {children}
    </div>

  </div>
);

/* ================= MODAL ================= */

const CustomerModal = ({ data, onClose }: any) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 backdrop-blur-sm">

      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-violet-200/80 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.42)]">

        {/* HEADER */}

        <div className="relative border-b border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7f3ff_100%)] p-6">

          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-violet-200 bg-violet-50 p-2 text-violet-700 transition hover:bg-violet-100"
          >
            <X size={18} />
          </button>

          <h2 className="text-xl font-bold">
            {data.name}
          </h2>

          <p className="text-xs text-slate-600">
            Customer Profile
          </p>

        </div>

        {/* BODY */}

        <div className="max-h-[65vh] space-y-6 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] p-6">

          {/* STATS */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <Stat label="Orders" value={data.order_count} />
            <Stat label="Visits" value={data.visit_count} />
            <Stat label="Spent" value={money(data.total_spent)} />
            <Stat
              label="Avg"
              value={money(data.avg_order_value)}
            />

          </div>

          {/* INFO */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <Info label="Phone" value={data.phone} />
            <Info label="Joined" value={formatDate(data.created_at)} />
            <Info label="Last Visit" value={formatDate(data.last_visit_at)} />
            <Info
              label="Favorite"
              value={data.favorite_order_type}
            />

          </div>

        </div>

        {/* FOOTER */}

        <div className="flex justify-end border-t border-violet-100 bg-white p-4">

          <button
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2 font-semibold text-white shadow-[0_10px_20px_rgba(79,70,229,0.22)] transition hover:opacity-95"
          >
            Close
          </button>

        </div>

      </div>
    </div>
  );
};

const Stat = ({ label, value }: any) => (
  <div className="rounded-xl border border-violet-200 bg-violet-50/75 p-4">

    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-violet-600">
      {label}
    </p>

    <p className="text-xl font-bold text-slate-800">
      {value ?? 0}
    </p>

  </div>
);

const Info = ({ label, value }: any) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">

    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-500">
      {label}
    </p>

    <p className="font-semibold text-slate-800 mt-1">
      {value || "-"}
    </p>

  </div>
);






