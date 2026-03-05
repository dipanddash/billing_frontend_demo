import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, FileDown, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  REPORT_DEFINITIONS,
  fetchMyReportAccess,
  getCurrentUsername,
  readStaffReportAccessForUser,
  type StaffReportAccessByKey,
} from "@/lib/reportsConfig";

const API_BASE = "https://billingdemo-irsxd.ondigitalocean.app";

type ReportPayload = {
  meta?: Record<string, unknown>;
  summary?: Record<string, unknown>[];
  data?: Record<string, unknown>[];
  product_breakdown?: Record<string, unknown>[];
};

type ReportColumn = {
  key: string;
  label: string;
};

const asRows = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null) : []);
const formatHeader = (key: string) => key.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const inferColumns = (rows: Record<string, unknown>[]): ReportColumn[] => Object.keys(rows[0] ?? {}).map((key) => ({ key, label: formatHeader(key) }));
const toExportRows = (rows: Record<string, unknown>[], columns: ReportColumn[]) => rows.map((row) => Object.fromEntries(columns.map((c) => [c.label, row[c.key] ?? "-"])));

const DAILY_SALES_SUMMARY_COLUMNS: ReportColumn[] = [
  { key: "from_date", label: "From Date" },
  { key: "to_date", label: "To Date" },
  { key: "total_orders", label: "Total Orders" },
  { key: "total_items_sold", label: "Total Items Sold" },
  { key: "gross_sales", label: "Gross Sales" },
  { key: "total_discount", label: "Total Discount" },
  { key: "total_gst", label: "Total GST" },
  { key: "net_sales", label: "Net Sales" },
  { key: "cash_total", label: "Cash Total" },
  { key: "upi_total", label: "UPI Total" },
  { key: "card_total", label: "Card Total" },
];

const DAILY_SALES_PRODUCT_COLUMNS: ReportColumn[] = [
  { key: "product_name", label: "Product Name" },
  { key: "category", label: "Category" },
  { key: "quantity_sold", label: "Quantity Sold" },
  { key: "gross_amount", label: "Gross Amount" },
  { key: "discount", label: "Discount" },
  { key: "gst", label: "GST" },
  { key: "net_amount", label: "Net Amount" },
];

const PRODUCT_WISE_SALES_COLUMNS: ReportColumn[] = [
  { key: "product_name", label: "Product Name" },
  { key: "sku_code", label: "SKU / Code" },
  { key: "category", label: "Category" },
  { key: "quantity_sold", label: "Quantity Sold" },
  { key: "total_revenue", label: "Total Revenue" },
  { key: "total_discount", label: "Total Discount" },
  { key: "net_revenue", label: "Net Revenue" },
  { key: "avg_selling_price", label: "Avg Selling Price" },
  { key: "profit", label: "Profit" },
  { key: "profit_margin_percent", label: "Profit Margin %" },
];

const PAYMENT_METHOD_COLUMNS: ReportColumn[] = [
  { key: "date", label: "Date" },
  { key: "order_count", label: "Order Count" },
  { key: "cash_total", label: "Cash Total" },
  { key: "upi_total", label: "UPI Total" },
  { key: "card_total", label: "Card Total" },
  { key: "machine_charges", label: "Machine Charges" },
  { key: "net_received", label: "Net Received" },
  { key: "refund_amount", label: "Refund Amount" },
];

const DISCOUNT_COLUMNS: ReportColumn[] = [
  { key: "date", label: "Date" },
  { key: "order_no", label: "Order No" },
  { key: "customer_name", label: "Customer Name" },
  { key: "discount_type", label: "Discount Type" },
  { key: "discount_percent", label: "Discount %" },
  { key: "discount_amount", label: "Discount Amount" },
  { key: "applied_by", label: "Applied By" },
  { key: "order_value", label: "Order Value" },
  { key: "final_amount", label: "Final Amount" },
];

const CANCELLED_VOID_COLUMNS: ReportColumn[] = [
  { key: "date", label: "Date" },
  { key: "order_no", label: "Order No" },
  { key: "order_type", label: "Order Type" },
  { key: "customer_name", label: "Customer Name" },
  { key: "cancelled_by", label: "Cancelled By" },
  { key: "reason", label: "Reason" },
  { key: "order_amount", label: "Order Amount" },
  { key: "time_cancelled", label: "Time Cancelled" },
];
const KOT_COLUMNS: ReportColumn[] = [
  { key: "kot_no", label: "KOT No" },
  { key: "order_no", label: "Order No" },
  { key: "table_no", label: "Table No" },
  { key: "order_time", label: "Order Time" },
  { key: "item_name", label: "Item Name" },
  { key: "quantity", label: "Quantity" },
  { key: "status", label: "Status" },
  { key: "prepared_time", label: "Prepared Time" },
  { key: "served_time", label: "Served Time" },
];

const CUSTOMER_COLUMNS: ReportColumn[] = [
  { key: "customer_name", label: "Customer Name" },
  { key: "phone", label: "Phone" },
  { key: "total_orders", label: "Total Orders" },
  { key: "total_spent", label: "Total Spent" },
  { key: "avg_order_value", label: "Avg Order Value" },
  { key: "first_visit", label: "First Visit" },
  { key: "last_visit", label: "Last Visit" },
  { key: "preferred_order_type", label: "Preferred Order Type" },
];

const PURCHASE_COLUMNS: ReportColumn[] = [
  { key: "purchase_date", label: "Purchase Date" },
  { key: "purchase_id", label: "Purchase ID" },
  { key: "supplier_name", label: "Supplier Name" },
  { key: "invoice_no", label: "Invoice No" },
  { key: "product_name", label: "Product Name" },
  { key: "quantity", label: "Quantity" },
  { key: "unit_cost", label: "Unit Cost" },
  { key: "gst", label: "GST" },
  { key: "total_amount", label: "Total Amount" },
  { key: "payment_status", label: "Payment Status" },
];

const SUPPLIER_WISE_COLUMNS: ReportColumn[] = [
  { key: "supplier_name", label: "Supplier Name" },
  { key: "total_purchases", label: "Total Purchases" },
  { key: "total_amount", label: "Total Amount" },
  { key: "paid_amount", label: "Paid Amount" },
  { key: "outstanding", label: "Outstanding" },
  { key: "last_purchase_date", label: "Last Purchase Date" },
];

const STOCK_RANGE_COLUMNS: ReportColumn[] = [
  { key: "product_name", label: "Product Name" },
  { key: "opening_stock", label: "Opening Stock" },
  { key: "stock_in", label: "Stock In" },
  { key: "stock_out", label: "Stock Out" },
  { key: "closing_stock", label: "Closing Stock" },
  { key: "unit", label: "Unit" },
  { key: "stock_value", label: "Stock Value" },
];

const STOCK_CONSUMPTION_COLUMNS: ReportColumn[] = [
  { key: "ingredient_name", label: "Ingredient Name" },
  { key: "used_quantity", label: "Used Quantity" },
  { key: "unit", label: "Unit" },
  { key: "related_product", label: "Related Product" },
  { key: "total_orders", label: "Total Orders" },
  { key: "date_range", label: "Date Range" },
];

const WASTAGE_COLUMNS: ReportColumn[] = [
  { key: "ingredient_name", label: "Ingredient Name" },
  { key: "quantity_wasted", label: "Quantity Wasted" },
  { key: "unit", label: "Unit" },
  { key: "reason", label: "Reason" },
  { key: "staff_name", label: "Staff Name" },
  { key: "date", label: "Date" },
];

const LOW_STOCK_COLUMNS: ReportColumn[] = [
  { key: "ingredient_name", label: "Ingredient Name" },
  { key: "current_stock", label: "Current Stock" },
  { key: "reorder_level", label: "Reorder Level" },
  { key: "required_quantity", label: "Required Quantity" },
  { key: "supplier", label: "Supplier" },
  { key: "last_purchase_date", label: "Last Purchase Date" },
];

const INGREDIENT_COLUMNS: ReportColumn[] = [
  { key: "ingredient_name", label: "Ingredient Name" },
  { key: "category", label: "Category" },
  { key: "unit", label: "Unit" },
  { key: "current_stock", label: "Current Stock" },
  { key: "cost_per_unit", label: "Cost Per Unit" },
  { key: "total_value", label: "Total Value" },
  { key: "supplier", label: "Supplier" },
];

const MENU_COLUMNS: ReportColumn[] = [
  { key: "product_name", label: "Product Name" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price" },
  { key: "cost_price", label: "Cost Price" },
  { key: "profit", label: "Profit" },
  { key: "profit_percent", label: "Profit %" },
  { key: "is_active", label: "Is Active" },
  { key: "created_date", label: "Created Date" },
];

const STAFF_ATTENDANCE_COLUMNS: ReportColumn[] = [
  { key: "staff_name", label: "Staff Name" },
  { key: "role", label: "Role" },
  { key: "date", label: "Date" },
  { key: "check_in", label: "Check-in" },
  { key: "check_out", label: "Check-out" },
  { key: "total_hours", label: "Total Hours" },
  { key: "status", label: "Status" },
];

const STAFF_LOGIN_COLUMNS: ReportColumn[] = [
  { key: "staff_name", label: "Staff Name" },
  { key: "login_time", label: "Login Time" },
  { key: "logout_time", label: "Logout Time" },
  { key: "duration", label: "Duration" },
  { key: "device", label: "Device" },
  { key: "ip_address", label: "IP Address" },
];

const GST_COLUMNS: ReportColumn[] = [
  { key: "invoice_no", label: "Invoice No" },
  { key: "date", label: "Date" },
  { key: "customer_name", label: "Customer Name" },
  { key: "taxable_amount", label: "Taxable Amount" },
  { key: "cgst", label: "CGST" },
  { key: "sgst", label: "SGST" },
  { key: "igst", label: "IGST" },
  { key: "total_gst", label: "Total GST" },
  { key: "grand_total", label: "Grand Total" },
  { key: "hsn_code", label: "HSN Code" },
];

const EXPENSE_COLUMNS: ReportColumn[] = [
  { key: "expense_date", label: "Expense Date" },
  { key: "category", label: "Category" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount" },
  { key: "paid_by", label: "Paid By" },
  { key: "payment_method", label: "Payment Method" },
  { key: "reference_no", label: "Reference No" },
];

const DELIVERY_COLUMNS: ReportColumn[] = [
  { key: "order_no", label: "Order No" },
  { key: "date", label: "Date" },
  { key: "customer_name", label: "Customer Name" },
  { key: "platform", label: "Platform" },
  { key: "delivery_time", label: "Delivery Time" },
  { key: "amount", label: "Amount" },
  { key: "payment_mode", label: "Payment Mode" },
];

const DINE_IN_COLUMNS: ReportColumn[] = [
  { key: "order_no", label: "Order No" },
  { key: "date", label: "Date" },
  { key: "table_no", label: "Table No" },
  { key: "guest_count", label: "Guest Count" },
  { key: "total_items", label: "Total Items" },
  { key: "total_amount", label: "Total Amount" },
  { key: "avg_bill_value", label: "Avg Bill Value" },
];

const ONLINE_COLUMNS: ReportColumn[] = [
  { key: "platform", label: "Platform" },
  { key: "order_count", label: "Order Count" },
  { key: "gross_sales", label: "Gross Sales" },
  { key: "commission", label: "Commission" },
  { key: "net_settlement", label: "Net Settlement" },
  { key: "avg_order_value", label: "Avg Order Value" },
];

const COMBO_COLUMNS: ReportColumn[] = [
  { key: "combo_name", label: "Combo Name" },
  { key: "quantity_sold", label: "Quantity Sold" },
  { key: "revenue", label: "Revenue" },
  { key: "discount", label: "Discount" },
  { key: "net_revenue", label: "Net Revenue" },
  { key: "profit", label: "Profit" },
];

const PEAK_SALES_TIME_COLUMNS: ReportColumn[] = [
  { key: "time_slot_hour", label: "Time Slot (Hour)" },
  { key: "orders_count", label: "Orders Count" },
  { key: "items_sold", label: "Items Sold" },
  { key: "revenue", label: "Revenue" },
  { key: "avg_order_value", label: "Avg Order Value" },
];

export default function StaffReports() {
  const token = localStorage.getItem("access");
  const [resolvedUsername, setResolvedUsername] = useState<string>(getCurrentUsername());
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [serverAccess, setServerAccess] = useState<StaffReportAccessByKey | null>(null);
  const [accessLoadError, setAccessLoadError] = useState<string | null>(null);

  useEffect(() => {
    const resolveUsername = async () => {
      if (!token) return;
      setUsernameLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/accounts/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const uname = String(data?.username ?? "").trim().toLowerCase();
        if (uname) setResolvedUsername(uname);
      } catch {
        // fallback to localStorage username
      } finally {
        setUsernameLoading(false);
      }
    };
    void resolveUsername();
  }, [token]);

  useEffect(() => {
    const loadServerAccess = async () => {
      if (!token) return;
      try {
        const access = await fetchMyReportAccess(token);
        setServerAccess(access);
        setAccessLoadError(null);
      } catch {
        setServerAccess(null);
        setAccessLoadError("Unable to fetch report access from server. Please logout/login and try again.");
      }
    };
    void loadServerAccess();
  }, [token]);

  const currentUsername = resolvedUsername || getCurrentUsername();
  const userRaw = (() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return {};
      return JSON.parse(raw) as { username?: string; name?: string; email?: string };
    } catch {
      return {};
    }
  })();
  const candidateKeys = Array.from(
    new Set(
      [
        currentUsername,
        String(userRaw.username ?? "").trim().toLowerCase(),
        String(userRaw.name ?? "").trim().toLowerCase(),
        String(userRaw.email ?? "").trim().toLowerCase(),
        String(userRaw.email ?? "")
          .trim()
          .toLowerCase()
          .split("@")[0],
      ].filter(Boolean),
    ),
  );
  const localFallbackAccess = candidateKeys
    .map((key) => readStaffReportAccessForUser(key))
    .find((access) => Object.values(access).some(Boolean)) ?? readStaffReportAccessForUser(currentUsername);
  const staffAccess = serverAccess ?? localFallbackAccess;
  const staffReports = REPORT_DEFINITIONS.filter((r) => staffAccess[r.key] === true);

  const [selectedReport, setSelectedReport] = useState<string>(staffReports[0]?.name ?? "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orderType, setOrderType] = useState("");
  const [staff, setStaff] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState("");
  const [payload, setPayload] = useState<ReportPayload>({});
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [activeReportKey, setActiveReportKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authUsername, setAuthUsername] = useState(currentUsername);
  const [authPassword, setAuthPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const selectedMeta = staffReports.find((r) => r.name === selectedReport);
  useEffect(() => {
    if (!staffReports.length) {
      setSelectedReport("");
      return;
    }
    if (!staffReports.some((r) => r.name === selectedReport)) {
      setSelectedReport(staffReports[0].name);
    }
  }, [staffReports, selectedReport]);
  const summaryRows = useMemo(() => asRows(payload.summary), [payload.summary]);
  const dataRows = useMemo(() => asRows(payload.data), [payload.data]);
  const productRows = useMemo(() => asRows(payload.product_breakdown), [payload.product_breakdown]);
  const summaryColumns = useMemo(
    () => (activeReportKey === "daily-sales" ? DAILY_SALES_SUMMARY_COLUMNS : inferColumns(summaryRows)),
    [activeReportKey, summaryRows],
  );
  const detailColumns = useMemo(
    () => {
      if (activeReportKey === "product-wise-sales") return PRODUCT_WISE_SALES_COLUMNS;
      if (activeReportKey === "payment-method") return PAYMENT_METHOD_COLUMNS;
      if (activeReportKey === "discount") return DISCOUNT_COLUMNS;
      if (activeReportKey === "cancelled-void") return CANCELLED_VOID_COLUMNS;
      if (activeReportKey === "kot") return KOT_COLUMNS;
      if (activeReportKey === "customer") return CUSTOMER_COLUMNS;
      if (activeReportKey === "purchase") return PURCHASE_COLUMNS;
      if (activeReportKey === "supplier-wise") return SUPPLIER_WISE_COLUMNS;
      if (activeReportKey === "stock-range") return STOCK_RANGE_COLUMNS;
      if (activeReportKey === "stock-consumption") return STOCK_CONSUMPTION_COLUMNS;
      if (activeReportKey === "wastage") return WASTAGE_COLUMNS;
      if (activeReportKey === "low-stock") return LOW_STOCK_COLUMNS;
      if (activeReportKey === "ingredient") return INGREDIENT_COLUMNS;
      if (activeReportKey === "menu") return MENU_COLUMNS;
      if (activeReportKey === "staff-attendance") return STAFF_ATTENDANCE_COLUMNS;
      if (activeReportKey === "staff-login") return STAFF_LOGIN_COLUMNS;
      if (activeReportKey === "gst") return GST_COLUMNS;
      if (activeReportKey === "expense") return EXPENSE_COLUMNS;
      if (activeReportKey === "delivery") return DELIVERY_COLUMNS;
      if (activeReportKey === "dine-in") return DINE_IN_COLUMNS;
      if (activeReportKey === "online") return ONLINE_COLUMNS;
      if (activeReportKey === "combo") return COMBO_COLUMNS;
      if (activeReportKey === "peak-sales-time") return PEAK_SALES_TIME_COLUMNS;
      return inferColumns(dataRows);
    },
    [activeReportKey, dataRows],
  );
  const productColumns = useMemo(
    () => (activeReportKey === "daily-sales" ? DAILY_SALES_PRODUCT_COLUMNS : inferColumns(productRows)),
    [activeReportKey, productRows],
  );
  const meta = (payload.meta ?? {}) as Record<string, unknown>;

  const loadReport = async () => {
    if (!selectedMeta) return;
    const qs = new URLSearchParams();
    if (fromDate) qs.set("from_date", fromDate);
    if (toDate) qs.set("to_date", toDate);
    if (orderType) qs.set("order_type", orderType);
    if (staff) qs.set("staff", staff);
    if (paymentMethod) qs.set("payment_method", paymentMethod);
    if (supplier) qs.set("supplier", supplier);
    if (category) qs.set("category", category);

    const url = `${API_BASE}/api/reports/${selectedMeta.endpoint}${qs.toString() ? `?${qs.toString()}` : ""}`;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error("Failed to load report");
      setPayload((await res.json()) as ReportPayload);
      setActiveReport(selectedMeta.name);
      setActiveReportKey(selectedMeta.key);
    } catch {
      setPayload({});
      setActiveReport(selectedMeta.name);
      setActiveReportKey(selectedMeta.key);
      setError("Unable to load report data.");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLoadReport = async () => {
    if (!selectedMeta) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const loginRes = await fetch(`${API_BASE}/api/accounts/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUsername.trim(), password: authPassword }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        throw new Error(String(loginData?.detail ?? "Invalid username/password."));
      }
      const role = String(loginData?.role ?? "").toUpperCase();
      const verifiedUsername = String(loginData?.username ?? "").trim().toLowerCase();
      if (role !== "STAFF") throw new Error("Only staff credentials are allowed.");
      if (currentUsername && verifiedUsername && verifiedUsername !== currentUsername) {
        throw new Error("Entered credentials do not match logged-in staff user.");
      }
      setAuthOpen(false);
      setAuthPassword("");
      await loadReport();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(summaryRows.length ? toExportRows(summaryRows, summaryColumns) : [{ Message: "No summary data" }]),
      "Summary",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(dataRows.length ? toExportRows(dataRows, detailColumns) : [{ Message: "No detailed data" }]),
      "Detailed Data",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(productRows.length ? toExportRows(productRows, productColumns) : [{ Message: "No product breakdown" }]),
      "Product Breakdown",
    );
    XLSX.writeFile(wb, `${activeReport ?? "Report"}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const lines = [
      String(meta.company_name ?? "Company"),
      `GST: ${String(meta.gst_no ?? "-")}`,
      String(meta.address ?? "-"),
      String(meta.report_name ?? activeReport ?? "Report"),
      `From: ${String(meta.from_date ?? "-")}  To: ${String(meta.to_date ?? "-")}`,
      `Generated On: ${String(meta.generated_on ?? "-")}`,
      `Generated By: ${String(meta.generated_by ?? "-")}`,
    ];
    let y = 12;
    lines.forEach((line) => {
      doc.text(line, 14, y);
      y += 6;
    });
    const rows = dataRows.length ? dataRows : summaryRows;
    autoTable(doc, {
      head: [Object.keys(rows[0] ?? { message: "No data" })],
      body: rows.length ? rows.map((r) => Object.values(r).map((v) => String(v ?? "-"))) : [["No data"]],
      startY: y + 2,
    });
    doc.save(`${activeReport ?? "Report"}.pdf`);
  };

  return (
    <div className="relative min-h-screen space-y-5 overflow-hidden bg-[linear-gradient(180deg,#f8f6ff_0%,#f3f4f9_46%,#f8fafc_100%)] p-4 md:p-6">
      <div className="pointer-events-none absolute -left-24 top-6 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-3xl border border-violet-200/70 bg-[linear-gradient(130deg,#ffffff_0%,#f9f6ff_46%,#f3efff_100%)] p-6 shadow-[0_22px_55px_rgba(76,29,149,0.12)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">Staff Analytics</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Staff Reports</h1>
        <p className="mt-1 text-sm text-slate-600">Global filters, secure access check, and PDF/Excel exports.</p>
      </div>

      <div className="rounded-2xl border border-violet-200/70 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)} className="h-11 rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-300/40">
            {staffReports.map((r) => <option key={r.key} value={r.name}>{r.name}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-11 rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-300/40" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-11 rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-300/40" />
          <button onClick={() => setAuthOpen(true)} disabled={loading || !selectedMeta} className="h-11 rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(79,70,229,0.24)] disabled:opacity-50">{loading ? "Loading..." : "Load Report"}</button>
        </div>
        
      </div>

      {!usernameLoading && staffReports.length === 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
          <p className="text-sm text-rose-700">
            No reports are assigned to your staff account. Contact admin to grant report access.
          </p>
          {accessLoadError ? (
            <p className="mt-2 text-xs text-rose-600">{accessLoadError}</p>
          ) : null}
        </div>
      ) : null}

      {authOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-violet-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8f5ff_100%)] p-5 shadow-[0_24px_65px_rgba(15,23,42,0.24)]">
            <h3 className="text-base font-semibold text-violet-950">Staff Verification Required</h3>
            <p className="mt-1 text-xs text-violet-700/80">
              Enter username and password again to open this report.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!authLoading) void verifyAndLoadReport();
              }}
            >
              <input
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Username"
                className="h-11 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-300/40"
              />
              <div className="relative">
                <input
                  type={showAuthPassword ? "text" : "password"}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password"
                  className="h-11 w-full rounded-xl border border-violet-200 bg-white px-3 pr-11 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-300/40"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-violet-600 hover:bg-violet-50"
                  aria-label={showAuthPassword ? "Hide password" : "Show password"}
                >
                  {showAuthPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {authError ? <p className="text-xs text-rose-700">{authError}</p> : null}
              <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthOpen(false);
                  setAuthPassword("");
                  setAuthError(null);
                  setShowAuthPassword(false);
                }}
                className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-violet-700 hover:bg-violet-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={authLoading}
                className="rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(79,70,229,0.24)] disabled:opacity-60"
              >
                {authLoading ? "Verifying..." : "Verify & Open"}
              </button>
            </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeReport ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-violet-200/70 bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-bold text-slate-900">{activeReport}</h2>
            <div className="flex gap-2">
              <button onClick={exportPDF} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"><FileDown className="h-4 w-4" />PDF</button>
              <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(79,70,229,0.24)]"><FileSpreadsheet className="h-4 w-4" />Excel</button>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200/70 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-violet-700">Summary ({summaryRows.length})</h3>
            {summaryRows.length === 0 ? <p className="text-sm text-slate-500">No summary rows.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead><tr className="bg-violet-50/60">{summaryColumns.map((c) => <th key={c.key} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-violet-700">{c.label}</th>)}</tr></thead>
                  <tbody>{summaryRows.map((row, idx) => <tr key={idx} className="border-t border-violet-100 hover:bg-violet-50/30">{summaryColumns.map((c) => <td key={c.key} className="px-3 py-2 text-sm text-slate-700">{String(row[c.key] ?? "-")}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-violet-200/70 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <div className="border-b border-violet-100 bg-violet-50/70 px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-violet-700">Detailed Data ({dataRows.length})</div>
            {loading ? <p className="p-4 text-sm text-slate-500">Loading...</p> : error ? <p className="p-4 text-sm text-rose-700">{error}</p> : dataRows.length === 0 ? <p className="p-4 text-sm text-slate-500">No rows.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead><tr className="bg-violet-50/60">{detailColumns.map((c) => <th key={c.key} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-violet-700">{c.label}</th>)}</tr></thead>
                  <tbody>{dataRows.map((row, idx) => <tr key={idx} className="border-t border-violet-100 hover:bg-violet-50/30">{detailColumns.map((c) => <td key={c.key} className="px-3 py-2 text-sm text-slate-700">{String(row[c.key] ?? "-")}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-violet-200/70 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <div className="border-b border-violet-100 bg-violet-50/70 px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-violet-700">Product Breakdown ({productRows.length})</div>
            {productRows.length === 0 ? <p className="p-4 text-sm text-slate-500">No product breakdown for this report.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead><tr className="bg-violet-50/60">{productColumns.map((c) => <th key={c.key} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-violet-700">{c.label}</th>)}</tr></thead>
                  <tbody>{productRows.map((row, idx) => <tr key={idx} className="border-t border-violet-100 hover:bg-violet-50/30">{productColumns.map((c) => <td key={c.key} className="px-3 py-2 text-sm text-slate-700">{String(row[c.key] ?? "-")}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}




