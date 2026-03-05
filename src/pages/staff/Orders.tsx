import StatusBadge from "@/components/StatusBadge";
import {
  AlertCircle,
  BadgeIndianRupee,
  CheckCircle2,
  FileText,
  
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BASE_URL = "https://billingdemo-irsxd.ondigitalocean.app";

interface OrderRow {
  id: string;
  orderRef: string;
  table: string;
  customer: string;
  items: number;
  total: string;
  status: "paid" | "pending" | "cancelled" | "cooking" | "ready" | "served";
  paymentStatus: string;
  time: string;
  bill: string;
}

interface InvoiceItem {
  quantity: number;
  name: string;
  total: number | string;
  base_price: number | string;
  gst_percent: number;
  line_gst: number | string;
  line_total: number;
  addons?: Array<{
    name: string;
    quantity_per_item?: number;
    quantity_total?: number;
    unit_price?: number | string;
    line_total?: number | string;
  }>;
}

interface InvoiceData {
  bill_number: string;
  date: string;
  customer_name: string;
  customer_phone?: string;
  payment_method: string;
  items: InvoiceItem[];
  line_items?: Array<{
    name: string;
    quantity: number;
    base_price: number;
    line_total: number;
    addons?: Array<{
      name: string;
      quantity_per_item?: number;
      quantity_total?: number;
      unit_price?: number | string;
      line_total?: number | string;
    }>;
  }>;
  order_type?: string;
  staff?: string;
  payment_status?: string;
  subtotal: number | string;
  total_gst: number | string;
  discount: number;
  manual_discount?: number | string;
  coupon_discount?: number | string;
  coupon_details?: {
    code?: string;
    discount_type?: string;
    value?: number | string;
    discount_amount?: number | string;
  } | null;
  discount_breakdown?: {
    manual_discount?: number | string;
    coupon_discount?: number | string;
    total_discount?: number | string;
  };
  grand_total: number;
  final_amount: number | string;
}

const RECEIPT_HEADER = {
  legalName: "Kensei Food & Beverages Private Limited",
  branchName: "DIP & DASH PERUNGUDI CHENNAI",
  address: "Address : Ground  Floor, No 12, Rajiv Gandhi Salai, Srinivasa Nagar, Kandhanchavadi, Perungudi, Chennai, Tamil Nadu 600096",
  phone: "+91 8 124 123 000",
  cin: "U56301TZ2025PTC035161",
  gstin: "33AACCA8432H1ZZ",
  fssai: "22426550000259",
};

const getLogoDataUrl = async (): Promise<string | null> => {
  try {
    const response = await fetch("/logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const Orders = () => {
  const token = localStorage.getItem("access");

  const toBadgeStatus = (paymentStatus: unknown, rawStatus: unknown): OrderRow["status"] => {
    const payment = String(paymentStatus ?? "").toUpperCase();
    const status = String(rawStatus ?? "").toUpperCase();
    if (status === "CANCELLED" || payment === "REFUNDED") return "cancelled";
    if (payment === "PAID") return "paid";
    if (status === "CANCELLED") return "cancelled";
    if (status === "READY") return "ready";
    if (status === "SERVED" || status === "COMPLETED") return "served";
    if (status === "IN_PROGRESS" || status === "COOKING") return "cooking";
    return "pending";
  };

  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentInput, setPaymentInput] = useState("");
  const [cashGiven, setCashGiven] = useState("");
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/orders/list/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = (await res.json()) as Array<Record<string, unknown>>;

      const formatted = data.map((order) => ({
        id: String(order.id),
        orderRef: String(order.order_id ?? order.bill_number ?? order.id ?? ""),
        table: (order.table_name as string) || "TakeAway",
        customer: (order.customer_name as string) || "Walk-in",
        items: Number(order.items_count || 0),
        total: `Rs ${order.total_amount}`,
        status: toBadgeStatus(order.payment_status, order.status),
        paymentStatus: String(order.payment_status ?? ""),
        time: new Date(String(order.created_at)).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        bill: String(order.bill_number || ""),
      }));

      setOrders(formatted);
    } catch (err) {
      console.error("Failed to load orders", err);
    }
  }, [token]);

  useEffect(() => {
    void loadOrders();
    const intervalId = window.setInterval(() => {
      void loadOrders();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [loadOrders]);

  const openPaymentModal = (orderId: string) => {
    setSelectedOrder(orderId);
    setPaymentMethod("CASH");
    setPaymentInput("");
    setCashGiven("");
  };

  const closeModal = () => {
    setSelectedOrder(null);
  };

  const confirmPayment = async () => {
    if (!selectedOrder) return;

    const selected = orders.find((o) => o.id === selectedOrder);
    const payable = Number(String(selected?.total || 0).replace(/[^0-9.]/g, ""));
    if (paymentMethod === "CARD" && !paymentInput.trim()) {
      alert("Card number/reference is required.");
      return;
    }
    if (paymentMethod === "CASH") {
      const cashVal = Number(cashGiven || 0);
      if (!Number.isFinite(cashVal) || cashVal < payable) {
        alert("Cash given should be at least bill amount.");
        return;
      }
    }

    try {
      const res = await fetch(`${BASE_URL}/api/orders/pay/${selectedOrder}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: paymentMethod,
          reference: paymentMethod === "CARD" ? paymentInput.trim() || null : null,
          cash_received: paymentMethod === "CASH" ? cashGiven || null : null,
        }),
      });

      if (res.ok) {
        closeModal();

        setOrders((prev) =>
          prev.map((o) => (o.id === selectedOrder ? { ...o, status: "paid" } : o))
        );

        loadOrders();
      } else {
        const raw = await res.text().catch(() => "");
        let err: any = {};
        try {
          err = raw ? JSON.parse(raw) : {};
        } catch {
          err = { raw };
        }
        const msg =
          (Array.isArray(err) && err.length > 0 ? String(err[0]) : "") ||
          (Array.isArray(err?.detail) && err.detail.length > 0 ? String(err.detail[0]) : "") ||
          String(err?.detail ?? err?.error ?? err?.message ?? err?.raw ?? "Payment failed");
        alert(msg);
      }
    } catch (err) {
      console.error("Payment error", err);
    }
  };

  const filtered = orders.filter(
    (o) =>
      o.orderRef.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase())
  );

  const openInvoiceModal = async (orderId: string) => {
    try {
      const [invoiceRes, detailRes] = await Promise.all([
        fetch(`${BASE_URL}/api/orders/invoice/${orderId}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${BASE_URL}/api/orders/${orderId}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const invoice = await invoiceRes.json().catch(() => ({}));
      if (!invoiceRes.ok) {
        const msg = String(
          (invoice as Record<string, unknown>)?.error ??
            (invoice as Record<string, unknown>)?.detail ??
            "Invoice not available for this order yet."
        );
        alert(msg);
        return;
      }
      const detail = detailRes.ok ? await detailRes.json() : {};

      const normalizedInvoice = invoice as InvoiceData;
      setInvoiceData(normalizedInvoice);
      setInvoiceOrderId(orderId);
      setWhatsAppPhone(String(detail?.customer_phone ?? ""));
      setWhatsAppStatus(null);
    } catch (err) {
      console.error("Invoice load failed", err);
      alert("Failed to load invoice details.");
    }
  };

  const sendWhatsApp = async () => {
    if (!invoiceData) return;

    const phoneInput = (whatsAppPhone || String(invoiceData.customer_phone ?? "")).trim();
    const normalizedPhone = phoneInput.replace(/\D/g, "");
    if (normalizedPhone.length < 10) {
      setWhatsAppStatus({
        tone: "error",
        text: "Customer phone not found. Enter a valid WhatsApp number.",
      });
      return;
    }

    const templateId =
      localStorage.getItem("fast2sms_whatsapp_template_id") ||
      import.meta.env.VITE_FAST2SMS_WHATSAPP_TEMPLATE_ID ||
      "";

    const payload: Record<string, unknown> = {
      phone: normalizedPhone,
      variables: [
        invoiceData.customer_name || "Customer",
        invoiceData.bill_number || "-",
        Number(invoiceData.final_amount || 0).toFixed(2),
        invoiceData.payment_method || "-",
        new Date(invoiceData.date).toLocaleDateString("en-GB"),
      ],
    };
    if (templateId) payload.message_id = templateId;

    setSendingWhatsApp(true);
    setWhatsAppStatus({ tone: "info", text: "Sending WhatsApp message..." });

    try {
      const response = await fetch(`${BASE_URL}/api/orders/send-whatsapp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.sent) {
        setWhatsAppStatus({ tone: "success", text: "WhatsApp sent successfully." });
        return;
      }

      const bodyText = data?.body ? JSON.stringify(data.body) : "";
      const reason =
        data?.provider_message ||
        (data?.reason === "provider_rejected" && bodyText ? bodyText : "") ||
        data?.reason ||
        data?.error ||
        bodyText ||
        `HTTP ${response.status}`;
      setWhatsAppStatus({ tone: "error", text: `WhatsApp failed: ${reason}` });
    } catch (error) {
      setWhatsAppStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to send WhatsApp message.",
      });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const downloadInvoicePdf = async (data: InvoiceData) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightX = pageWidth - margin;
    const centerX = pageWidth / 2;
    let y = 12;
    const logoDataUrl = await getLogoDataUrl();

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", centerX - 9, y, 18, 18);
      y += 22;
    }

    const formatAmount = (value: number | string) => Number(value || 0).toLocaleString();
    const itemRows = (data.line_items && data.line_items.length > 0
      ? data.line_items.flatMap((item) => {
          const baseRow = [[
            item.name,
            String(item.quantity),
            Number(item.base_price || 0).toFixed(2),
            "-",
            Number(item.line_total || 0).toFixed(2),
          ]];
          const addonRows = (item.addons || []).map((addon) => [
            `  + ${addon.name} x${Number(addon.quantity_per_item ?? addon.quantity_total ?? 0)} @ ${Number(addon.unit_price || 0).toFixed(2)}`,
            "",
            "",
            "",
            Number(addon.line_total || 0).toFixed(2),
          ]);
          return [...baseRow, ...addonRows];
        })
      : (data.items || []).flatMap((item) => {
          const baseRow = [[
            item.name,
            String(item.quantity),
            Number(item.base_price || 0).toFixed(2),
            Number(item.gst_percent || 0).toFixed(2),
            Number(item.line_total || 0).toFixed(2),
          ]];
          const addonRows = (item.addons || []).map((addon) => [
            `  + ${addon.name} x${Number(addon.quantity_per_item ?? addon.quantity_total ?? 0)} @ ${Number(addon.unit_price || 0).toFixed(2)}`,
            "",
            "",
            "",
            Number(addon.line_total || 0).toFixed(2),
          ]);
          return [...baseRow, ...addonRows];
        })) as string[][];

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(RECEIPT_HEADER.legalName, centerX, y, { align: "center" });
    y += 6;
    doc.setFontSize(11);
    doc.text(RECEIPT_HEADER.branchName, centerX, y, { align: "center" });
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const addressLines = doc.splitTextToSize(RECEIPT_HEADER.address, pageWidth - margin * 2);
    doc.text(addressLines, centerX, y, { align: "center" });
    y += addressLines.length * 4.5;
    doc.text(`Phone: ${RECEIPT_HEADER.phone}`, centerX, y, { align: "center" });
    y += 5;
    doc.text(`CIN: ${RECEIPT_HEADER.cin}`, centerX, y, { align: "center" });
    y += 5;
    doc.text(`GSTIN: ${RECEIPT_HEADER.gstin}`, centerX, y, { align: "center" });
    y += 5;
    doc.text(`FSSAI: ${RECEIPT_HEADER.fssai}`, centerX, y, { align: "center" });
    y += 8;

    doc.setDrawColor(180);
    doc.line(margin, y, rightX, y);
    y += 6;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE", centerX, y, { align: "center" });
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Bill No: ${data.bill_number}`, margin, y);
    doc.text(`Bill Dt: ${new Date(data.date).toLocaleString()}`, rightX, y, { align: "right" });
    y += 6;
    doc.text(`Customer: ${data.customer_name || "-"}`, margin, y);
    doc.text(`Cashier: ${data.staff || "-"}`, rightX, y, { align: "right" });
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Item", "Qty", "Price", "GST %", "Total"]],
      body: itemRows,
      styles: { fontSize: 9, cellPadding: 2.2 },
      headStyles: { fillColor: [33, 33, 33] },
      columnStyles: {
        0: { cellWidth: 88 },
        1: { halign: "right", cellWidth: 18 },
        2: { halign: "right", cellWidth: 24 },
        3: { halign: "right", cellWidth: 20 },
        4: { halign: "right", cellWidth: 28 },
      },
      margin: { left: margin, right: margin },
    });

    const tableEndY =
      (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
    let summaryY = tableEndY + 8;
    doc.setFont("helvetica", "bold");
    doc.text(`Subtotal: Rs.${formatAmount(data.subtotal)}`, rightX, summaryY, { align: "right" });
    summaryY += 6;
    doc.text(`Total GST: Rs.${formatAmount(data.total_gst)}`, rightX, summaryY, { align: "right" });
    summaryY += 6;
    doc.text(`Manual Discount: Rs.${formatAmount(data.manual_discount ?? data.discount_breakdown?.manual_discount ?? 0)}`, rightX, summaryY, { align: "right" });
    summaryY += 6;
    doc.text(`Coupon Discount: Rs.${formatAmount(data.coupon_discount ?? data.discount_breakdown?.coupon_discount ?? 0)}`, rightX, summaryY, { align: "right" });
    summaryY += 6;
    doc.text(`Total Discount: Rs.${formatAmount(data.discount)}`, rightX, summaryY, { align: "right" });
    summaryY += 7;
    doc.setFontSize(12);
    doc.text(`Final Amount: Rs.${formatAmount(data.final_amount)}`, rightX, summaryY, { align: "right" });
    summaryY += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Thank you. Visit again.", centerX, summaryY, { align: "center" });

    const safeBill = String(data.bill_number || "invoice").replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`invoice-${safeBill}.pdf`);
  };

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const paid = orders.filter((o) => o.status === "paid").length;
    const pending = totalOrders - paid;
    const revenue = orders.reduce((sum, o) => {
      const value = Number(String(o.total).replace(/[^0-9.]/g, ""));
      return sum + (Number.isNaN(value) ? 0 : value);
    }, 0);

    return { totalOrders, paid, pending, revenue };
  }, [orders]);

  const invoiceLineItems = useMemo(() => {
    if (!invoiceData) return [];
    if (invoiceData.line_items && invoiceData.line_items.length > 0) {
      return invoiceData.line_items.map((item) => ({
        ...item,
        addons: Array.isArray(item.addons) ? item.addons : [],
      }));
    }

    return (invoiceData.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      base_price: Number(item.base_price || 0),
      line_total: Number(item.line_total || 0),
      addons: Array.isArray(item.addons) ? item.addons : [],
    }));
  }, [invoiceData]);
  const invoiceManualDiscount = Number(
    invoiceData?.manual_discount ??
      invoiceData?.discount_breakdown?.manual_discount ??
      0
  );
  const invoiceCouponDiscount = Number(
    invoiceData?.coupon_discount ??
      invoiceData?.discount_breakdown?.coupon_discount ??
      0
  );

  return (
    <div className="orders-page relative min-h-screen overflow-hidden bg-[linear-gradient(140deg,#f6f1ff_0%,#fcfbff_48%,#efe7ff_100%)] p-4 md:p-6">
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            height: auto !important;
          }

          #root {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }

          header.fixed {
            display: none !important;
          }

          .orders-page {
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .orders-page > * {
            display: none !important;
          }

          .orders-page > .thermal-print-overlay {
            display: block !important;
            position: static !important;
            inset: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: 80mm !important;
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }

          .thermal-print-root {
            display: block !important;
            position: static !important;
            inset: auto !important;
            width: 80mm !important;
            max-width: 80mm !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff;
            color: #000;
            margin: 0;
            padding: 8px;
            font-family: "Courier New", monospace;
            font-size: 10px;
            line-height: 1.2;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .thermal-no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-[1500px] space-y-6 animate-fade-in">
        <div className="rounded-3xl border border-purple-200/70 bg-white/85 p-5 shadow-[0_20px_52px_rgba(109,40,217,0.12)] backdrop-blur-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                <ShoppingBag className="h-3.5 w-3.5" />
                Service Control
              </p>
              <h1 className="mt-2 text-2xl font-bold text-purple-950 md:text-3xl">
                Orders Command
              </h1>
              <p className="mt-1 text-sm text-purple-700/80">
                Track billing, payments, and invoice dispatch in one workspace.
              </p>
            </div>

            <div className="relative w-full max-w-sm">
             
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order id or customer..."
                className="w-full rounded-xl border border-purple-200 bg-white/90 py-2.5 pl-10 pr-3 text-sm text-purple-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-300/35"
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<ShoppingBag className="h-4 w-4" />}
              label="Total Orders"
              value={stats.totalOrders}
              tone="purple"
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Paid"
              value={stats.paid}
              tone="green"
            />
            <StatCard
              icon={<Wallet className="h-4 w-4" />}
              label="Pending"
              value={stats.pending}
              tone="amber"
            />
            <StatCard
              icon={<BadgeIndianRupee className="h-4 w-4" />}
              label="Revenue"
              value={`Rs ${stats.revenue.toFixed(0)}`}
              tone="purple"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-purple-200/70 bg-white shadow-[0_18px_45px_rgba(91,33,182,0.12)]">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full">
              <thead>
                <tr className="bg-[linear-gradient(120deg,#f5eeff_0%,#fbf8ff_100%)] text-left">
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                    Order
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                    Table
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                    Items
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                    Time
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-purple-100">
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="transition hover:bg-purple-50/60"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-purple-900">
                      #{o.orderRef}
                    </td>
                    <td className="px-6 py-4 text-sm text-purple-800">{o.table}</td>
                    <td className="px-6 py-4 text-sm text-purple-900">{o.customer}</td>
                    <td className="px-6 py-4 text-sm text-purple-700/80">{o.items}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-purple-900">
                      {o.total}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          variant={o.status}
                          label={
                            o.status === "cancelled" && o.paymentStatus.toUpperCase() === "REFUNDED"
                              ? "Refunded"
                              : undefined
                          }
                        />

                        {o.status === "paid" ? (
                          <>
                            <button
                              onClick={() => openInvoiceModal(o.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-200"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Invoice
                            </button>
                          </>
                        ) : o.status !== "cancelled" ? (
                          <button
                            onClick={() => openPaymentModal(o.id)}
                            className="rounded-lg bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(91,33,182,0.28)] transition hover:opacity-95"
                          >
                            Pay Now
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-purple-700/80">{o.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {invoiceData && (
        <div className="thermal-print-overlay fixed inset-0 z-50 bg-black/50 p-4 sm:p-6 flex items-center justify-center">
          <div className="thermal-print-root w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border shadow-soft">
            <div className="thermal-no-print px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">Bill Preview</p>
              <button
                onClick={() => {
                  setInvoiceData(null);
                  setInvoiceOrderId(null);
                  setWhatsAppPhone("");
                  setWhatsAppStatus(null);
                }}
                className="px-3 py-1.5 text-xs rounded-md border border-input hover:bg-accent"
              >
                Close
              </button>
            </div>

            <div className="p-4 bg-white text-slate-900">
              <div className="mx-auto w-full max-w-md rounded-md border border-dashed border-slate-300 p-3 font-mono text-[10px] leading-tight">
                <div className="text-center border-b border-dashed border-slate-300 pb-3">
                  <img
                    src="/logo.png"
                    alt="CAFEFLOW Logo"
                    className="mx-auto mb-2 h-10 w-auto object-contain"
                  />
                  <h3 className="text-sm font-bold tracking-wide">{RECEIPT_HEADER.legalName}</h3>
                  <p className="mt-1 font-semibold">{RECEIPT_HEADER.branchName}</p>
                  <div className="my-1 border-t border-dashed border-slate-400" />
                  <p className="mt-1">{RECEIPT_HEADER.address}</p>
                  <p>Phone: {RECEIPT_HEADER.phone}</p>
                  <div className="my-1 border-t border-dashed border-slate-400" />
                  <p>CIN: {RECEIPT_HEADER.cin}</p>
                  <p>GSTIN: {RECEIPT_HEADER.gstin}</p>
                  <p>FSSAI: {RECEIPT_HEADER.fssai}</p>
                  <div className="my-1 border-t border-dashed border-slate-400" />
                  <div className="mt-2">
                    <p className="font-bold tracking-wide">TAX INVOICE</p>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-left">
                      <p><span className="font-semibold">Bill No:</span> {invoiceData.bill_number}</p>
                      <p><span className="font-semibold">Bill Dt:</span> {new Date(invoiceData.date).toLocaleString()}</p>
                      <p><span className="font-semibold">Customer:</span> {invoiceData.customer_name || "-"}</p>
                      <p><span className="font-semibold">Cashier:</span> {invoiceData.staff || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="py-3 border-b border-dashed border-slate-300">
                  <p className="mb-2 font-semibold">Items List</p>
                  <div className="grid grid-cols-12 gap-2 font-semibold mb-2">
                    <p className="col-span-5">Item</p>
                    <p className="col-span-2 text-right">Qty</p>
                    <p className="col-span-2 text-right">Price</p>
                    <p className="col-span-3 text-right">Total</p>
                  </div>
                  <div className="space-y-1.5">
                    {invoiceLineItems.length > 0 ? (
                      invoiceLineItems.map((li, idx) => (
                        <div key={`${li.name}-${idx}`} className="space-y-0.5">
                          <div className="grid grid-cols-12 gap-2">
                            <p className="col-span-5 truncate">{li.name}</p>
                            <p className="col-span-2 text-right">{li.quantity}</p>
                            <p className="col-span-2 text-right">{Number(li.base_price).toFixed(0)}</p>
                            <p className="col-span-3 text-right">{Number(li.line_total).toFixed(0)}</p>
                          </div>
                          {(li.addons || []).map((addon, addonIdx) => (
                            <div key={`${li.name}-${idx}-addon-${addonIdx}`} className="grid grid-cols-12 gap-2 text-[9px] text-slate-600">
                              <p className="col-span-8 pl-2">
                                + {addon.name} x{Number(addon.quantity_per_item ?? addon.quantity_total ?? 0)} / item @ Rs {Number(addon.unit_price || 0).toFixed(2)}
                              </p>
                              <p className="col-span-4 text-right">Rs {Number(addon.line_total || 0).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-500">No items available in invoice payload.</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rs.{Number(invoiceData.subtotal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total GST</span>
                    <span>Rs.{Number(invoiceData.total_gst).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Discount</span>
                    <span>Rs.{invoiceManualDiscount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Coupon Discount
                      {invoiceData.coupon_details?.code
                        ? ` (${invoiceData.coupon_details.code} - ${String(invoiceData.coupon_details.discount_type || "")})`
                        : ""}
                    </span>
                    <span>Rs.{invoiceCouponDiscount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Discount</span>
                    <span>Rs.{Number(invoiceData.discount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-dashed border-slate-300 pt-2 text-sm">
                    <span>Final Amount</span>
                    <span>Rs.{Number(invoiceData.final_amount).toLocaleString()}</span>
                  </div>
                </div>

                <p className="mt-4 text-center text-[11px] text-slate-500">Thank you. Visit again.</p>
              </div>

              <div className="thermal-no-print mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black"
                >
                  Thermal Print
                </button>
                <button
                  onClick={() => downloadInvoicePdf(invoiceData)}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => sendWhatsApp()}
                  disabled={sendingWhatsApp}
                  className="rounded-md bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {sendingWhatsApp ? "Sending..." : "WhatsApp"}
                </button>
              </div>
              <div className="thermal-no-print mt-3 flex items-center justify-center gap-2">
                <input
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value)}
                  placeholder="Customer WhatsApp number"
                  className="w-full max-w-xs rounded-md border border-input px-3 py-2 text-xs"
                />
                <span className="text-[11px] text-slate-500">
                  {invoiceOrderId ? `Order: ${invoiceOrderId.slice(0, 8)}...` : ""}
                </span>
              </div>
              {whatsAppStatus && (
                <div
                  className={`thermal-no-print mt-3 rounded-xl border px-3 py-2 text-xs ${
                    whatsAppStatus.tone === "success"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : whatsAppStatus.tone === "error"
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-sky-300 bg-sky-50 text-sky-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {whatsAppStatus.tone === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <p className="break-words">{whatsAppStatus.text}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0220]/55 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmPayment();
            }}
            className="w-full max-w-[420px] rounded-2xl border border-purple-200 bg-white p-6 shadow-[0_26px_70px_rgba(49,17,98,0.38)]"
          >
            <h2 className="text-lg font-semibold text-purple-950">Complete Payment</h2>
            <p className="mt-1 text-sm text-purple-700/80">
              Choose payment mode and confirm transaction.
            </p>

            <div className="mt-4 space-y-3">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-sm text-purple-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-300/35"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </select>

              {paymentMethod === "CASH" && (
                <>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    placeholder="Cash given"
                    className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-sm text-purple-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-300/35"
                  />
                  <p className="text-xs text-purple-700/80">
                    Balance: Rs {(() => {
                      const selected = orders.find((o) => o.id === selectedOrder);
                      const payable = Number(String(selected?.total || 0).replace(/[^0-9.]/g, ""));
                      const given = Number(cashGiven || 0);
                      const balance = (Number.isFinite(given) ? given : 0) - (Number.isFinite(payable) ? payable : 0);
                      return balance.toFixed(2);
                    })()}
                  </p>
                </>
              )}

              {paymentMethod === "CARD" && (
                <input
                  type="text"
                  value={paymentInput}
                  onChange={(e) => setPaymentInput(e.target.value)}
                  placeholder="Enter Card Number / Reference"
                  className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-sm text-purple-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-300/35"
                />
              )}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-purple-200 px-4 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Confirm Payment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: JSX.Element;
  label: string;
  value: number | string;
  tone: "purple" | "green" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-purple-200 bg-purple-50 text-purple-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

export default Orders;


