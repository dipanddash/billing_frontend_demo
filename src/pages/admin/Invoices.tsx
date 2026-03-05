import StatusBadge from '@/components/StatusBadge';
import { Download, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { AreaChart, Area } from "recharts";

const API_BASE = "https://billingdemo-irsxd.ondigitalocean.app";

type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

interface InvoiceRow {
  id: string;
  customer: string;
  date: string;
  due: string;
  amount: string;
  status: InvoiceStatus;
  orderPk: string;
  numericAmount: number;
}

interface InvoiceLineItem {
  name: string;
  quantity: number;
  base_price: number;
  gst_percent: number;
  gst_amount: number;
  line_total: number;
  addons?: Array<{
    name: string;
    quantity_per_item?: number;
    quantity_total?: number;
    unit_price?: number | string;
    line_total?: number | string;
  }>;
}

interface InvoiceDetail {
  bill_number: string;
  date: string;
  order_type: string;
  staff: string;
  customer_name: string;
  subtotal: number;
  total_gst: number;
  grand_total: number;
  discount: number;
  manual_discount?: number;
  coupon_discount?: number;
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
  final_amount: number;
  payment_method: string;
  payment_status: string;
  line_items: InvoiceLineItem[];
}

const RECEIPT_HEADER = {
  legalName: "Kensei Food & Beverages Private Limited",
  branchName: "DIP & DASH PERUNGUDI CHENNAI",
  address: "No. 144, Survey No-56/1A, Corporation Road, Seevaram Village, Perungudi, Chennai, Tamil Nadu - 600096",
  phone: "04424960610",
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

const fallbackInvoices: InvoiceRow[] = [
  { id: 'INV-001', customer: 'John Smith', date: '2026-02-15', due: '2026-03-15', amount: 'Rs.1,250.00', status: 'paid', orderPk: '', numericAmount: 1250 },
  { id: 'INV-002', customer: 'Emily Davis', date: '2026-02-14', due: '2026-03-14', amount: 'Rs.840.00', status: 'pending', orderPk: '', numericAmount: 840 },
  { id: 'INV-003', customer: 'Mike Wilson', date: '2026-02-13', due: '2026-02-28', amount: 'Rs.2,100.00', status: 'overdue', orderPk: '', numericAmount: 2100 },
  { id: 'INV-004', customer: 'Lisa Chen', date: '2026-02-12', due: '2026-03-12', amount: 'Rs.560.00', status: 'paid', orderPk: '', numericAmount: 560 },
  { id: 'INV-005', customer: 'Robert Brown', date: '2026-02-11', due: '2026-03-11', amount: 'Rs.1,890.00', status: 'cancelled', orderPk: '', numericAmount: 1890 },
  { id: 'INV-006', customer: 'Sarah Johnson', date: '2026-02-10', due: '2026-03-10', amount: 'Rs.420.00', status: 'pending', orderPk: '', numericAmount: 420 },
  { id: 'INV-007', customer: 'David Lee', date: '2026-02-09', due: '2026-03-09', amount: 'Rs.3,200.00', status: 'paid', orderPk: '', numericAmount: 3200 },
  { id: 'INV-008', customer: 'Anna Park', date: '2026-02-08', due: '2026-03-08', amount: 'Rs.780.00', status: 'pending', orderPk: '', numericAmount: 780 },
];

const Invoices = () => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>(fallbackInvoices);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState("30");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [loadingInvoicePk, setLoadingInvoicePk] = useState<string | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
  const [cancelTargetInvoice, setCancelTargetInvoice] = useState<InvoiceRow | null>(null);
  const [cancelRequestingPk, setCancelRequestingPk] = useState<string | null>(null);
  const [cancelErrorText, setCancelErrorText] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const mapStatus = (paymentRaw: unknown, orderRaw: unknown, dueDate: string): InvoiceStatus => {
    const payment = String(paymentRaw ?? "").toLowerCase();
    const order = String(orderRaw ?? "").toLowerCase();
    const paymentNormalized = payment.replace(/[\s_-]+/g, "");
    const dueTime = new Date(dueDate).setHours(23, 59, 59, 999);
    const isOverdueByDate = dueTime < Date.now();

    if (payment.includes("cancel") || order.includes("cancel")) return "cancelled";
    if (payment.includes("overdue") || order.includes("overdue")) return "overdue";

    // Keep invoice status aligned with live order flow when order status is provided.
    if (
      order.includes("pending") ||
      order.includes("new") ||
      order.includes("placed") ||
      order.includes("prepar") ||
      order.includes("ready")
    ) {
      return "pending";
    }

    // IMPORTANT: avoid substring bugs like "unpaid" -> "paid"
    if (
      paymentNormalized === "paid" ||
      paymentNormalized === "paymentdone" ||
      paymentNormalized === "success" ||
      paymentNormalized === "completed"
    ) {
      return "paid";
    }

    // If payment status is absent/unknown, keep invoice unpaid by default.
    if (
      paymentNormalized === "pending" ||
      paymentNormalized === "unpaid" ||
      paymentNormalized === "notpaid" ||
      paymentNormalized === "failed" ||
      !paymentNormalized
    ) {
      return isOverdueByDate ? "overdue" : "pending";
    }

    return isOverdueByDate ? "overdue" : "pending";
  };

  const formatDate = (input: unknown) => {
    if (!input) return new Date().toISOString().slice(0, 10);
    const d = new Date(String(input));
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  };

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const headers = getAuthHeaders();
        let list: Array<Record<string, unknown>> = [];

        // Prefer full list endpoint if available.
        const listRes = await fetch(`${API_BASE}/api/orders/list/`, { headers });
        if (listRes.ok) {
          const listRaw = await listRes.json();
          list = Array.isArray(listRaw)
            ? (listRaw as Array<Record<string, unknown>>)
            : [];
        } else {
          // Fallback: pull all paginated pages from recent endpoint.
          let nextUrl: string | null = `${API_BASE}/api/orders/recent/`;
          while (nextUrl) {
            const res = await fetch(nextUrl, { headers });
            if (!res.ok) break;

            const raw = await res.json();
            if (Array.isArray(raw)) {
              list = [...list, ...(raw as Array<Record<string, unknown>>)];
              nextUrl = null;
            } else {
              const pageResults = Array.isArray(raw?.results)
                ? (raw.results as Array<Record<string, unknown>>)
                : [];
              list = [...list, ...pageResults];
              nextUrl = typeof raw?.next === "string" ? raw.next : null;
            }
          }
        }

        const mapped: InvoiceRow[] = list.map((row: Record<string, unknown>) => {
          const orderPk = String(row.id ?? "");
          const date = formatDate(row.created_at ?? row.date);
          const dueDate = row.due_date ? formatDate(row.due_date) : formatDate(new Date(new Date(date).setDate(new Date(date).getDate() + 30)));
          const computedStatus = mapStatus(row.payment_status, row.status, dueDate);
          const numericAmount = Number(row.total_amount ?? row.amount ?? row.grand_total ?? 0) || 0;
          return {
            id: row.bill_number
              ? `INV-${String(row.bill_number)}`
              : row.order_id
              ? `INV-${String(row.order_id)}`
              : "INV-ORDER",
            customer: String(row.customer_name ?? row.table_name ?? "Walk-in"),
            date,
            due: dueDate,
            amount: `Rs.${numericAmount.toLocaleString()}`,
            status: computedStatus,
            orderPk,
            numericAmount,
          };
        });

        if (mapped.length > 0) setInvoices(mapped);
      } catch (error) {
        console.error("Failed to load invoices:", error);
      }
    };

    void loadInvoices();
  }, []);

  const onViewInvoice = async (invoice: InvoiceRow) => {
    const fallbackDetail: InvoiceDetail = {
      bill_number: invoice.id.replace("INV-", ""),
      date: invoice.date,
      order_type: "-",
      staff: "-",
      customer_name: invoice.customer,
      subtotal: invoice.numericAmount,
      total_gst: 0,
      grand_total: invoice.numericAmount,
      discount: 0,
      final_amount: invoice.numericAmount,
      payment_method: "-",
      payment_status: invoice.status.toUpperCase(),
      line_items: [],
    };

    if (!invoice.orderPk) {
      setSelectedInvoice(fallbackDetail);
      setIsInvoiceModalOpen(true);
      return;
    }

    setLoadingInvoicePk(invoice.orderPk);
    setLoadingInvoiceId(invoice.id);
    try {
      const res = await fetch(`${API_BASE}/api/orders/invoice/${invoice.orderPk}/`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(String(err?.error ?? err?.detail ?? "Invoice not available for this order yet."));
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/pdf") || contentType.includes("octet-stream")) {
        const blob = await res.blob();
        const fileUrl = URL.createObjectURL(blob);
        window.open(fileUrl, "_blank");
        setTimeout(() => URL.revokeObjectURL(fileUrl), 3000);
        return;
      }

      const data = await res.json();
      const raw = Array.isArray(data) ? data[0] : data;
      const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
      if (!record) return;

      const itemsRaw = Array.isArray(record.line_items)
        ? record.line_items
        : Array.isArray(record.items)
        ? record.items
        : [];
      const lineItems: InvoiceLineItem[] = itemsRaw.map((item) => {
        const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          name: String(row.name ?? "Item"),
          quantity: Number(row.quantity ?? 0),
          base_price: Number(row.base_price ?? 0),
          gst_percent: Number(row.gst_percent ?? 0),
          gst_amount: Number(row.gst_amount ?? 0),
          line_total: Number(row.line_total ?? 0),
          addons: Array.isArray(row.addons)
            ? row.addons.map((addonRow) => {
                const addon = addonRow && typeof addonRow === "object"
                  ? (addonRow as Record<string, unknown>)
                  : {};
                return {
                  name: String(addon.name ?? "Addon"),
                  quantity_per_item: Number(addon.quantity_per_item ?? 0),
                  quantity_total: Number(addon.quantity_total ?? 0),
                  unit_price: Number(addon.unit_price ?? 0),
                  line_total: Number(addon.line_total ?? 0),
                };
              })
            : [],
        };
      });

      setSelectedInvoice({
        bill_number: String(record.bill_number ?? "-"),
        date: String(record.date ?? ""),
        order_type: String(record.order_type ?? "-"),
        staff: String(record.staff ?? "-"),
        customer_name: String(record.customer_name ?? "-"),
        subtotal: Number(record.subtotal ?? 0),
        total_gst: Number(record.total_gst ?? 0),
        grand_total: Number(record.grand_total ?? 0),
        discount: Number(record.discount ?? 0),
        manual_discount: Number(record.manual_discount ?? (record.discount_breakdown as Record<string, unknown> | undefined)?.manual_discount ?? 0),
        coupon_discount: Number(record.coupon_discount ?? (record.discount_breakdown as Record<string, unknown> | undefined)?.coupon_discount ?? 0),
        coupon_details:
          record.coupon_details && typeof record.coupon_details === "object"
            ? (record.coupon_details as InvoiceDetail["coupon_details"])
            : null,
        discount_breakdown:
          record.discount_breakdown && typeof record.discount_breakdown === "object"
            ? (record.discount_breakdown as InvoiceDetail["discount_breakdown"])
            : undefined,
        final_amount: Number(record.final_amount ?? 0),
        payment_method: String(record.payment_method ?? "-"),
        payment_status: String(record.payment_status ?? "-"),
        line_items: lineItems,
      });
      setIsInvoiceModalOpen(true);
    } catch (error) {
      console.error("Failed to open invoice:", error);
      alert(error instanceof Error ? error.message : "Failed to open invoice.");
    } finally {
      setLoadingInvoicePk(null);
      setLoadingInvoiceId(null);
    }
  };

  const openCancelOrderModal = (invoice: InvoiceRow) => {
    if (!invoice.orderPk || invoice.status === "cancelled") return;
    setCancelErrorText("");
    setCancelTargetInvoice(invoice);
  };

  const closeCancelOrderModal = () => {
    if (cancelRequestingPk) return;
    setCancelErrorText("");
    setCancelTargetInvoice(null);
  };

  const confirmCancelOrder = async () => {
    if (!cancelTargetInvoice?.orderPk || cancelTargetInvoice.status === "cancelled") return;
    const invoice = cancelTargetInvoice;

    try {
      setCancelRequestingPk(invoice.orderPk);
      setCancelErrorText("");
      const res = await fetch(`${API_BASE}/api/orders/cancel/${invoice.orderPk}/`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(String(err?.error ?? err?.detail ?? `Cancel failed with status ${res.status}`));
      }

      setInvoices((prev) =>
        prev.map((row) =>
          row.orderPk === invoice.orderPk
            ? { ...row, status: "cancelled" }
            : row
        )
      );
      setCancelTargetInvoice(null);
    } catch (error) {
      console.error("Failed to cancel order:", error);
      setCancelErrorText(error instanceof Error ? error.message : "Failed to cancel order.");
    } finally {
      setCancelRequestingPk(null);
    }
  };

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.customer.toLowerCase().includes(search.toLowerCase()) ||
      inv.id.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || inv.status === statusFilter;

    const invoiceDate = new Date(inv.date);
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - Number(daysFilter));

    const matchDate = invoiceDate >= pastDate;

    return matchSearch && matchStatus && matchDate;
  });

  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((acc, inv) => acc + inv.numericAmount, 0);

  const pendingAmount = invoices
    .filter(inv => inv.status === 'pending')
    .reduce((acc, inv) => acc + inv.numericAmount, 0);

  const overdueAmount = invoices
    .filter(inv => inv.status === 'overdue')
    .reduce((acc, inv) => acc + inv.numericAmount, 0);

  const totalInvoices = invoices.length;

  const sparkData = [
    { value: 400 },
    { value: 600 },
    { value: 500 },
    { value: 800 },
    { value: 700 },
    { value: 900 },
  ];

  const paymentData = [
    { name: "Cash", value: 35 },
    { name: "Card", value: 45 },
    { name: "UPI", value: 20 },
  ];

  const COLORS = ["#8b5cf6", "#a78bfa", "#c4b5fd"];

  const exportRows = filtered.map((inv) => ({
    Invoice: inv.id,
    Customer: inv.customer,
    Date: inv.date,
    DueDate: inv.due,
    Amount: inv.numericAmount,
    Status: inv.status,
  }));

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, `invoices-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setShowExportMenu(false);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Invoices Report", 14, 14);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);

    autoTable(doc, {
      startY: 26,
      head: [["Invoice", "Customer", "Date", "Due Date", "Amount", "Status"]],
      body: exportRows.map((r) => [
        r.Invoice,
        r.Customer,
        r.Date,
        r.DueDate,
        `Rs.${Number(r.Amount).toLocaleString()}`,
        r.Status,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [124, 58, 237] },
    });

    doc.save(`invoices-${new Date().toISOString().slice(0, 10)}.pdf`);
    setShowExportMenu(false);
  };

  const handleDownloadInvoicePdf = async () => {
    if (!selectedInvoice) return;

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
    doc.text(`Bill No: ${selectedInvoice.bill_number}`, margin, y);
    doc.text(`Bill Dt: ${selectedInvoice.date}`, rightX, y, { align: "right" });
    y += 6;
    doc.text(`Customer: ${selectedInvoice.customer_name || "-"}`, margin, y);
    doc.text(`Cashier: ${selectedInvoice.staff || "-"}`, rightX, y, { align: "right" });
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Item", "Qty", "Price", "GST %", "Total"]],
      body: selectedInvoice.line_items.flatMap((li) => {
        const baseRow = [[
          li.name,
          String(li.quantity),
          Number(li.base_price || 0).toFixed(2),
          Number(li.gst_percent || 0).toFixed(2),
          Number(li.line_total || 0).toFixed(2),
        ]];
        const addonRows = (li.addons || []).map((addon) => [
          `  + ${addon.name} x${Number(addon.quantity_per_item ?? addon.quantity_total ?? 0)} @ ${Number(addon.unit_price || 0).toFixed(2)}`,
          "",
          "",
          "",
          Number(addon.line_total || 0).toFixed(2),
        ]);
        return [...baseRow, ...addonRows];
      }),
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
    const manualDiscount = Number(
      selectedInvoice.manual_discount ??
        selectedInvoice.discount_breakdown?.manual_discount ??
        0
    );
    const couponDiscount = Number(
      selectedInvoice.coupon_discount ??
        selectedInvoice.discount_breakdown?.coupon_discount ??
        0
    );
    doc.setFont("helvetica", "bold");
    doc.text(`Subtotal: Rs.${selectedInvoice.subtotal.toLocaleString()}`, rightX, summaryY, { align: "right" });
    summaryY += 6;
    doc.text(`Total GST: Rs.${selectedInvoice.total_gst.toLocaleString()}`, rightX, summaryY, { align: "right" });
    summaryY += 6;
    doc.text(`Manual Discount: Rs.${manualDiscount.toLocaleString()}`, rightX, summaryY, { align: "right" });
    summaryY += 6;
    doc.text(`Coupon Discount: Rs.${couponDiscount.toLocaleString()}`, rightX, summaryY, { align: "right" });
    summaryY += 6;
    doc.text(`Total Discount: Rs.${selectedInvoice.discount.toLocaleString()}`, rightX, summaryY, { align: "right" });
    summaryY += 7;
    doc.setFontSize(12);
    doc.text(`Final Amount: Rs.${selectedInvoice.final_amount.toLocaleString()}`, rightX, summaryY, { align: "right" });
    summaryY += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Thank you. Visit again.", centerX, summaryY, { align: "center" });

    const safeBill = String(selectedInvoice.bill_number || "detail").replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`invoice-${safeBill}.pdf`);
  };

  const handleDownloadInvoiceExcel = () => {
    if (!selectedInvoice) return;

    const itemsSheet = selectedInvoice.line_items.flatMap((li) => {
      const baseRow = [{
        Item: li.name,
        Quantity: li.quantity,
        Price: li.base_price,
        GSTPercent: li.gst_percent,
        GSTAmount: li.gst_amount,
        LineTotal: li.line_total,
      }];
      const addonRows = (li.addons || []).map((addon) => ({
        Item: `+ ${addon.name}`,
        Quantity: Number(addon.quantity_total ?? addon.quantity_per_item ?? 0),
        Price: Number(addon.unit_price || 0),
        GSTPercent: "",
        GSTAmount: "",
        LineTotal: Number(addon.line_total || 0),
      }));
      return [...baseRow, ...addonRows];
    });

    const summarySheet = [
      { Field: "Bill Number", Value: selectedInvoice.bill_number },
      { Field: "Date", Value: selectedInvoice.date },
      { Field: "Customer", Value: selectedInvoice.customer_name },
      { Field: "Order Type", Value: selectedInvoice.order_type },
      { Field: "Staff", Value: selectedInvoice.staff },
      { Field: "Payment Method", Value: selectedInvoice.payment_method },
      { Field: "Payment Status", Value: selectedInvoice.payment_status },
      { Field: "Subtotal", Value: selectedInvoice.subtotal },
      { Field: "Total GST", Value: selectedInvoice.total_gst },
      { Field: "Manual Discount", Value: Number(selectedInvoice.manual_discount ?? selectedInvoice.discount_breakdown?.manual_discount ?? 0) },
      { Field: "Coupon Discount", Value: Number(selectedInvoice.coupon_discount ?? selectedInvoice.discount_breakdown?.coupon_discount ?? 0) },
      { Field: "Total Discount", Value: selectedInvoice.discount },
      { Field: "Coupon Code", Value: selectedInvoice.coupon_details?.code ?? "" },
      { Field: "Coupon Type", Value: selectedInvoice.coupon_details?.discount_type ?? "" },
      { Field: "Final Amount", Value: selectedInvoice.final_amount },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summarySheet), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(itemsSheet), "Items");
    XLSX.writeFile(workbook, `invoice-${selectedInvoice.bill_number || "detail"}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative rounded-2xl border border-violet-200 bg-[linear-gradient(135deg,#1f1638_0%,#35235f_45%,#5e3aa3_100%)] p-6 text-white shadow-[0_14px_34px_rgba(45,22,82,0.24)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_85%_25%,rgba(255,255,255,0.16),transparent_28%)]" />
        <div className="relative z-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-violet-200">Finance Control</p>
            <h1 className="mt-2 text-3xl font-bold">Invoices</h1>
            <p className="mt-1 text-sm text-violet-100/90">Manage and track all invoices</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-44 overflow-hidden rounded-xl border border-violet-200 bg-white text-slate-900 shadow-2xl">
                <button
                  onClick={handleExportPdf}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-violet-50"
                >
                  Download PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-violet-50"
                >
                  Download Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Total Revenue", value: totalRevenue, color: "text-violet-700" },
          { title: "Pending Amount", value: pendingAmount, color: "text-amber-600" },
          { title: "Overdue", value: overdueAmount, color: "text-rose-600" },
          { title: "Total Invoices", value: totalInvoices, color: "text-violet-700" },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-violet-100 bg-white p-4 shadow-[0_4px_16px_rgba(20,10,50,0.06)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-400">{card.title}</p>
            <h3 className={`mt-2 text-2xl font-bold ${card.color}`}>
              {card.title === "Total Invoices" ? card.value : `Rs.${Number(card.value).toLocaleString()}`}
            </h3>
            <div className="mt-3 h-[42px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id={`spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.34} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill={`url(#spark-${i})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_4px_16px_rgba(20,10,50,0.06)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Payment Method Breakdown</h3>
          </div>
          <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={58} outerRadius={88} dataKey="value" paddingAngle={4}>
                    {paymentData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {paymentData.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/45 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_4px_16px_rgba(20,10,50,0.06)]">
          <h3 className="text-sm font-semibold text-foreground">Filter Controls</h3>
          <p className="mt-1 text-xs text-muted-foreground">Search and narrow invoice records</p>
          <div className="mt-4 space-y-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            />
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last 1 Year</option>
            </select>
            <div className="flex flex-wrap gap-2">
              {['all', 'paid', 'pending', 'overdue', 'cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    statusFilter === s
                      ? 'bg-violet-600 text-white shadow-[0_6px_16px_rgba(124,58,237,0.3)]'
                      : 'border border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_4px_16px_rgba(20,10,50,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-violet-50/70">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500">Invoice</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500">Customer</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500">Date</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500">Due Date</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500">Amount</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100">
              {filtered.map(inv => (
                <tr key={inv.id} className="transition-colors hover:bg-violet-50/45">
                  <td className="px-6 py-3.5 text-sm font-semibold text-violet-700">{inv.id}</td>
                  <td className="px-6 py-3.5 text-sm text-foreground">{inv.customer}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{inv.date}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{inv.due}</td>
                  <td className="px-6 py-3.5 text-sm font-semibold text-foreground">{inv.amount}</td>
                  <td className="px-6 py-3.5"><StatusBadge variant={inv.status} /></td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void onViewInvoice(inv)}
                        className="rounded-lg border border-violet-200 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                        disabled={loadingInvoicePk === inv.orderPk && loadingInvoiceId === inv.id}
                      >
                        {loadingInvoicePk === inv.orderPk && loadingInvoiceId === inv.id ? "Loading..." : "View"}
                      </button>
                      {inv.status !== "cancelled" && (
                        <button
                          onClick={() => openCancelOrderModal(inv)}
                          disabled={cancelRequestingPk === inv.orderPk}
                          className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        >
                          {cancelRequestingPk === inv.orderPk ? "Cancelling..." : inv.status === "paid" ? "Refund & Cancel" : "Cancel"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-violet-100 px-6 py-3">
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {invoices.length} invoices</p>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-violet-200 p-1.5 hover:bg-violet-50"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-xs text-muted-foreground">Page 1 of 1</span>
            <button className="rounded-md border border-violet-200 p-1.5 hover:bg-violet-50"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      {cancelTargetInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">Cancel Order</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {cancelTargetInvoice.status === "paid"
                    ? "This will refund stock and cancel the paid order."
                    : "This action will cancel the selected order."}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p><span className="font-medium text-slate-700">Invoice:</span> {cancelTargetInvoice.id}</p>
              <p><span className="font-medium text-slate-700">Customer:</span> {cancelTargetInvoice.customer}</p>
              <p><span className="font-medium text-slate-700">Amount:</span> {cancelTargetInvoice.amount}</p>
            </div>

            {cancelErrorText && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {cancelErrorText}
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCancelOrderModal}
                disabled={Boolean(cancelRequestingPk)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => void confirmCancelOrder()}
                disabled={Boolean(cancelRequestingPk)}
                data-enter-action="true"
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {cancelRequestingPk ? "Cancelling..." : cancelTargetInvoice.status === "paid" ? "Refund & Cancel" : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isInvoiceModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border shadow-soft">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">Bill Preview</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadInvoicePdf}
                  className="px-3 py-1.5 text-xs rounded-md border border-violet-200 text-violet-700 hover:bg-violet-50"
                >
                  Download PDF
                </button>
                <button
                  onClick={handleDownloadInvoiceExcel}
                  className="px-3 py-1.5 text-xs rounded-md border border-violet-200 text-violet-700 hover:bg-violet-50"
                >
                  Download Excel
                </button>
                <button
                  onClick={() => {
                    setIsInvoiceModalOpen(false);
                    setSelectedInvoice(null);
                  }}
                  className="px-3 py-1.5 text-xs rounded-md border border-input hover:bg-accent"
                >
                  Close
                </button>
              </div>
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
                      <p><span className="font-semibold">Bill No:</span> {selectedInvoice.bill_number}</p>
                      <p><span className="font-semibold">Bill Dt:</span> {selectedInvoice.date}</p>
                      <p><span className="font-semibold">Customer:</span> {selectedInvoice.customer_name || "-"}</p>
                      <p><span className="font-semibold">Cashier:</span> {selectedInvoice.staff || "-"}</p>
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
                    {selectedInvoice.line_items.length > 0 ? (
                      selectedInvoice.line_items.map((li, idx) => (
                        <div key={`${li.name}-${idx}`} className="space-y-0.5">
                          <div className="grid grid-cols-12 gap-2">
                            <p className="col-span-5 truncate">{li.name}</p>
                            <p className="col-span-2 text-right">{li.quantity}</p>
                            <p className="col-span-2 text-right">{li.base_price.toFixed(0)}</p>
                            <p className="col-span-3 text-right">{li.line_total.toFixed(0)}</p>
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
                    <span>Rs.{selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total GST</span>
                    <span>Rs.{selectedInvoice.total_gst.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Discount</span>
                    <span>Rs.{Number(selectedInvoice.manual_discount ?? selectedInvoice.discount_breakdown?.manual_discount ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Coupon Discount
                      {selectedInvoice.coupon_details?.code
                        ? ` (${selectedInvoice.coupon_details.code} - ${String(selectedInvoice.coupon_details.discount_type || "")})`
                        : ""}
                    </span>
                    <span>Rs.{Number(selectedInvoice.coupon_discount ?? selectedInvoice.discount_breakdown?.coupon_discount ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Discount</span>
                    <span>Rs.{selectedInvoice.discount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-dashed border-slate-300 pt-2 text-sm">
                    <span>Final Amount</span>
                    <span>Rs.{selectedInvoice.final_amount.toLocaleString()}</span>
                  </div>
                </div>

                <p className="mt-4 text-center text-[11px] text-slate-500">Thank you. Visit again.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;


