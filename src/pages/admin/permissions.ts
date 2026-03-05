export const MODULES = [
  "Dashboard",
  "Invoices",
  "Products",
  "Coupons",
  "Customers",
  "Vendors",
  "Reports",
  "Inventory",
];

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  Admin: MODULES,
  Manager: [
    "Dashboard",
    "Invoices",
    "Products",
    "Coupons",
    "Customers",
    "Vendors",
    "Reports",
    "Inventory",
  ],
  Accountant: ["Dashboard", "Invoices", "Vendors", "Reports"],
  Staff: ["Dashboard"],
};
