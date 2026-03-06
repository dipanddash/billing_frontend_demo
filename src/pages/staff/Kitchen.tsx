import { useEffect, useState } from "react";
import {
  Clock,
  Flame,
  CheckCircle,
  Truck,
  Bell,
} from "lucide-react";

/* ================= CONFIG ================= */

const BASE_URL = "http://192.168.1.18:8000";

/* ================= TYPES ================= */

interface OrderItem {
  name: string;
  qty: number;
  image?: string | null;
  addonSummary?: string;
}

interface KitchenOrder {
  id: string;
  orderRef: string;
  table: string;
  customer: string;
  order_type: "DINE_IN" | "TAKEAWAY" | "SWIGGY" | "ZOMATO";
  payment_status?: string;
  items: OrderItem[];
  status: "NEW" | "IN_PROGRESS" | "READY" | "SERVED";
}

/* ================= STATUS ================= */

const columns = [
  {
    label: "Pending",
    status: "NEW",
    icon: Clock,
    color: "text-[#7c3aed]",
  },
  {
    label: "Cooking",
    status: "IN_PROGRESS",
    icon: Flame,
    color: "text-[#8b5cf6]",
  },
  {
    label: "Ready",
    status: "READY",
    icon: CheckCircle,
    color: "text-[#6d28d9]",
  },
  {
    label: "Served",
    status: "SERVED",
    icon: Truck,
    color: "text-[#5b21b6]",
  },
];

/* ================= COMPONENT ================= */

const Kitchen = () => {
  const token = localStorage.getItem("access");

  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================= LOAD ================= */

  useEffect(() => {
    loadOrders();

    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    if (!token) return;

    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/api/orders/today/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Fetch failed");

      const data = await res.json();

      /* FORMAT API DATA */

      const formatted: KitchenOrder[] = data.map((o: Record<string, unknown>) => ({
        id: o.id,
        orderRef: String(o.order_id ?? o.bill_number ?? o.id ?? ""),

        order_type: o.order_type as "DINE_IN" | "TAKEAWAY" | "SWIGGY" | "ZOMATO",

        table:
          o.order_type === "DINE_IN"
            ? (o.table_name as string) || "Table"
            : "Takeaway",

        /* ðŸ”¥ FIX CUSTOMER NULL ISSUE */
        customer:
          (o.customer_name as string) && (o.customer_name as string).trim() !== ""
            ? (o.customer_name as string)
            : (o.customer_phone as string)
            ? (o.customer_phone as string)
            : (o.user as { name?: string })?.name
            ? ((o.user as { name?: string }).name as string)
            : "Guest",

        /* ðŸ”¥ PREPARE ITEMS WITH IMAGE */
        items: Array.isArray(o.items)
          ? (o.items as Array<Record<string, unknown>>).map((i) => ({
              name: i.product_name as string,
              qty: Number(i.quantity),
              image: i.product_image
                ? `${BASE_URL}${i.product_image as string}`
                : null,
              addonSummary: String(i.addon_summary ?? ""),
            }))
          : [],

        payment_status: String(o.payment_status ?? "").toUpperCase(),
        status: o.status,
      }));

      const visibleForKitchen = formatted.filter((order) => {
        if (order.order_type !== "TAKEAWAY") return true;
        return order.payment_status === "PAID";
      });

      setOrders(visibleForKitchen);
    } catch (e) {
      console.error("Kitchen load error:", e);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UPDATE ================= */

  const updateStatus = async (id: string, status: string) => {
    if (!token) return;

    try {
      await fetch(`${BASE_URL}/api/orders/status/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      loadOrders();
    } catch (e) {
      console.error("Update error:", e);
    }
  };

  /* ================= COUNT ================= */

  const count = (s: string) =>
    orders.filter((o) => o.status === s).length;

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 space-y-5">
      <style>{`
        .kitchen-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .kitchen-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
      `}</style>
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-white px-6 py-5 shadow-[0_10px_24px_rgba(76,29,149,0.10)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#7c3aed_0%,#9f67ff_100%)]" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
              Kitchen Command Center
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Live Kitchen Display
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Realtime order monitoring and preparation workflow
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            {loading ? "Syncing..." : "Live"}
          </span>
        </div>
      </div>

      <div className="grid h-[calc(100vh-230px)] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const Icon = col.icon;
          const list = orders.filter((o) => o.status === col.status);

          return (
            <div key={col.status} className="flex min-h-0 flex-col">
              <div className="sticky top-0 z-10 mb-2 flex items-center gap-2 px-1 py-2">
                <Icon size={18} className={col.color} />
                <h3 className="text-sm font-semibold text-slate-800">
                  {col.label}
                </h3>
                <span className="ml-auto rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                  {list.length}
                </span>
              </div>

              <div className="kitchen-scroll flex-1 space-y-3 overflow-y-auto pr-1">
                {list.length === 0 && (
                  <p className="py-10 text-center text-xs text-slate-400">
                    No orders
                  </p>
                )}

                {list.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    status={col.status}
                    onUpdate={updateStatus}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ================= CARD ================= */

const OrderCard = ({
  order,
  status,
  onUpdate,
}: {
  order: KitchenOrder;
  status: string;
  onUpdate: (id: string, status: string) => void;
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 bg-white shadow-[0_6px_16px_rgba(76,29,149,0.08)] transition hover:shadow-[0_10px_22px_rgba(76,29,149,0.12)]">

      {/* IMAGES */}

      <div className="relative flex h-24 overflow-hidden bg-slate-100">

        {order.items.slice(0, 3).map((item, i) => (

          <img
            key={i}
            src={
              item.image ||
              "https://via.placeholder.com/300x200?text=Food"
            }
            className="h-full w-1/3 object-cover"
            alt={item.name}
          />

        ))}

        {order.items.length > 3 && (
          <div className="flex w-1/3 items-center justify-center bg-black/40 text-xs font-bold text-white">
            +{order.items.length - 3}
          </div>
        )}

        <span className="absolute right-2 top-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
          LIVE
        </span>

      </div>

      {/* CONTENT */}

      <div className="space-y-2 p-3.5">

        <p className="text-xs font-semibold text-violet-600">
          ORDER #{order.orderRef}
        </p>

        <p className="font-semibold text-slate-900 text-sm">
          {order.table} â€” {order.customer}
        </p>

        <ul className="space-y-1 text-xs text-slate-600">

          {order.items.map((i, idx) => (
            <li key={idx} className="flex items-center justify-between gap-2">
              <span className="truncate">
                {i.name}
                {i.addonSummary ? ` (+ ${i.addonSummary})` : ""}
              </span>
              <span className="font-semibold text-slate-500">x{i.qty}</span>
            </li>
          ))}

        </ul>

        {status !== "SERVED" && (

          <button
            onClick={() =>
              onUpdate(
                order.id,
                status === "NEW"
                  ? "IN_PROGRESS"
                  : status === "IN_PROGRESS"
                  ? "READY"
                  : "SERVED"
              )
            }
            className="mt-3 w-full rounded-lg bg-[linear-gradient(135deg,#7f56d9_0%,#6f43cf_100%)] py-2 text-xs font-semibold text-white transition hover:opacity-95"
          >
            {status === "NEW"
              ? "Start Cooking"
              : status === "IN_PROGRESS"
              ? "Mark Ready"
              : "Mark Served"}
          </button>

        )}

      </div>

    </div>
  );
};

export default Kitchen;




