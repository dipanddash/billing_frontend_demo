export type ReportDefinition = {
  key: string;
  name: string;
  desc: string;
  endpoint: string;
};

const API_BASE = "https://demo-j5fde.ondigitalocean.app";

export const STAFF_REPORT_ACCESS_KEY = "staff_report_access_v1";
export const STAFF_REPORT_ACCESS_BY_USER_KEY = "staff_report_access_by_user_v1";

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { key: "daily-sales", name: "Daily Sales Report", desc: "Revenue breakdown by day", endpoint: "v2/daily-sales/" },
  { key: "product-wise-sales", name: "Product Wise Sales Report", desc: "Performance by menu item", endpoint: "v2/product-wise-sales/" },
  { key: "payment-method", name: "Payment Method Report", desc: "Payments and settlement breakup", endpoint: "v2/payment-method/" },
  { key: "discount", name: "Discount Report", desc: "Discounts applied overview", endpoint: "v2/discount/" },
  { key: "cancelled-void", name: "Cancelled / Void Report", desc: "Cancelled orders and amount impact", endpoint: "v2/cancelled-void/" },
  { key: "kot", name: "KOT Report", desc: "Kitchen order ticket details", endpoint: "v2/kot/" },
  { key: "customer", name: "Customer Report", desc: "Customer visit and spend analytics", endpoint: "v2/customer/" },
  { key: "purchase", name: "Purchase Report", desc: "Purchases with supplier and item details", endpoint: "v2/purchase/" },
  { key: "supplier-wise", name: "Supplier Wise Report", desc: "Supplier purchase summary", endpoint: "v2/supplier-wise/" },
  { key: "stock-range", name: "Stock Report (Date Range)", desc: "Opening, movement and closing stock", endpoint: "v2/stock-range/" },
  { key: "stock-consumption", name: "Stock Consumption Report", desc: "Ingredient usage tracking", endpoint: "v2/stock-consumption/" },
  { key: "wastage", name: "Wastage Report", desc: "Spoilage and waste tracking", endpoint: "v2/wastage/" },
  { key: "low-stock", name: "Low Stock Report", desc: "Ingredients below reorder level", endpoint: "v2/low-stock/" },
  { key: "ingredient", name: "Ingredient Report", desc: "Current ingredient inventory valuation", endpoint: "v2/ingredient/" },
  { key: "menu", name: "Menu Report", desc: "Menu pricing and profitability view", endpoint: "v2/menu/" },
  { key: "staff-attendance", name: "Staff Attendance Report", desc: "Daily attendance and work hours", endpoint: "v2/staff-attendance/" },
  { key: "staff-login", name: "Staff Login Report", desc: "Login session details", endpoint: "v2/staff-login/" },
  { key: "gst", name: "GST Report", desc: "Tax collection summary", endpoint: "v2/gst/" },
  { key: "expense", name: "Expense Report", desc: "Operational costs breakdown", endpoint: "v2/expense/" },
  { key: "delivery", name: "Delivery Report", desc: "Delivery order analytics", endpoint: "v2/delivery/" },
  { key: "dine-in", name: "Dine In Report", desc: "In-house dining analytics", endpoint: "v2/dine-in/" },
  { key: "online", name: "Online Report (Swiggy/Zomato)", desc: "Online platform settlement view", endpoint: "v2/online/" },
  { key: "combo", name: "Combo Report", desc: "Bundle deal performance", endpoint: "v2/combo/" },
  { key: "peak-sales-time", name: "Peak Sales Time Report", desc: "Busiest hours analysis", endpoint: "v2/peak-sales-time/" },
];

export type StaffReportAccessByKey = Record<string, boolean>;
export type StaffReportAccessStore = Record<string, StaffReportAccessByKey>;
export type StaffUserOption = { id: string; username: string };

export const getCurrentUsername = (): string => {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { username?: string; name?: string; email?: string };
    return String(parsed.username ?? parsed.name ?? parsed.email ?? "").trim().toLowerCase();
  } catch {
    return "";
  }
};

export const getDefaultStaffReportAccess = (): StaffReportAccessByKey =>
  Object.fromEntries(REPORT_DEFINITIONS.map((r) => [r.key, false]));

export const readStaffReportAccessStore = (): StaffReportAccessStore => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STAFF_REPORT_ACCESS_BY_USER_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StaffReportAccessStore;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
};

export const writeStaffReportAccessStore = (store: StaffReportAccessStore) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STAFF_REPORT_ACCESS_BY_USER_KEY, JSON.stringify(store));
};

export const readStaffReportAccessForUser = (username: string): StaffReportAccessByKey => {
  const defaults = getDefaultStaffReportAccess();
  if (!username) return defaults;
  const store = readStaffReportAccessStore();
  const userAccess = store[username.toLowerCase()];
  if (!userAccess || typeof userAccess !== "object") return defaults;
  const merged = { ...defaults };
  for (const report of REPORT_DEFINITIONS) {
    if (typeof userAccess[report.key] === "boolean") {
      merged[report.key] = userAccess[report.key];
    }
  }
  return merged;
};

export const writeStaffReportAccessForUser = (username: string, accessByKey: StaffReportAccessByKey) => {
  if (!username) return;
  const normalized = username.toLowerCase();
  const store = readStaffReportAccessStore();
  store[normalized] = { ...getDefaultStaffReportAccess(), ...accessByKey };
  writeStaffReportAccessStore(store);
};

export const allowedReportsToAccessMap = (allowedReports: string[]): StaffReportAccessByKey => {
  const normalized = new Set(allowedReports.map((key) => String(key).trim()));
  const access = getDefaultStaffReportAccess();
  for (const report of REPORT_DEFINITIONS) {
    access[report.key] = normalized.has(report.key);
  }
  return access;
};

export const accessMapToAllowedReports = (accessByKey: StaffReportAccessByKey): string[] =>
  REPORT_DEFINITIONS.filter((report) => accessByKey[report.key] === true).map((report) => report.key);

const authHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

export const fetchStaffUsers = async (token: string): Promise<StaffUserOption[]> => {
  const res = await fetch(`${API_BASE}/api/accounts/staff/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load staff users");
  const data = await res.json();
  const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
  return list
    .map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ""),
      username: String(row.username ?? "").trim().toLowerCase(),
    }))
    .filter((row: StaffUserOption) => row.id && row.username);
};

export const fetchStaffReportAccess = async (token: string, staffId: string): Promise<StaffReportAccessByKey> => {
  if (!staffId) return getDefaultStaffReportAccess();
  const res = await fetch(`${API_BASE}/api/accounts/staff/report-access/?staff_id=${encodeURIComponent(staffId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load staff report access");
  const data = await res.json();
  const allowed = Array.isArray(data?.allowed_reports) ? data.allowed_reports.map(String) : [];
  return allowedReportsToAccessMap(allowed);
};

export const saveStaffReportAccess = async (
  token: string,
  staffId: string,
  accessByKey: StaffReportAccessByKey,
): Promise<void> => {
  if (!staffId) return;
  const res = await fetch(`${API_BASE}/api/accounts/staff/report-access/?staff_id=${encodeURIComponent(staffId)}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ allowed_reports: accessMapToAllowedReports(accessByKey) }),
  });
  if (!res.ok) throw new Error("Failed to save staff report access");
};

export const fetchMyReportAccess = async (token: string): Promise<StaffReportAccessByKey> => {
  const res = await fetch(`${API_BASE}/api/accounts/me/report-access/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load report access");
  const data = await res.json();
  const allowed = Array.isArray(data?.allowed_reports) ? data.allowed_reports.map(String) : [];
  return allowedReportsToAccessMap(allowed);
};



