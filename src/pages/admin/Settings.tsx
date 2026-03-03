import {
  Building2,
  Receipt,
  CreditCard,
  Users,
  Shield,
  Check,
  X
} from "lucide-react";
import { useState } from "react";
const currentUserRole = "Admin"; // replace with auth
/* ================= ROLE CONFIG ================= */

const ALL_MODULES = [
  "Dashboard",
  "Invoices",
  "Products",
  "Customers",
  "Payments",
  "Reports",
  "Inventory",
  "Settings",
];

const DEFAULT_MATRIX: Record<string, string[]> = {
  Admin: ALL_MODULES,
  Manager: [
    "Dashboard",
    "Invoices",
    "Products",
    "Customers",
    "Payments",
    "Reports",
    "Inventory",
  ],
  Accountant: ["Dashboard", "Invoices", "Payments", "Reports"],
  Staff: ["Dashboard"],
};

/* ================= SETTINGS SECTIONS ================= */

const settingSections = [
  {
    icon: <Building2 className="w-5 h-5" />,
    title: "Company Profile",
    desc: "Business details and branding",
  },
  {
    icon: <Receipt className="w-5 h-5" />,
    title: "Tax & GST",
    desc: "Tax configuration and compliance",
  },
  {
    icon: <CreditCard className="w-5 h-5" />,
    title: "Payment Gateways",
    desc: "Integrations and payment providers",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "User Roles & Permissions",
    desc: "Access control configuration",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Security & Invoice",
    desc: "Invoice formats and protection",
  },
];

/* ================= MAIN COMPONENT ================= */

const Settings = () => {
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX);
  const [selectedRole, setSelectedRole] = useState("Admin");

  // simulate current logged-in role
  const currentUserRole = "Admin"; // replace later with auth

  const togglePermission = (role: string, module: string) => {
    if (currentUserRole !== "Admin") return;

    const updated = { ...matrix };
    if (updated[role].includes(module)) {
      updated[role] = updated[role].filter((m) => m !== module);
    } else {
      updated[role] = [...updated[role], module];
    }
    setMatrix(updated);
  };

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">System Settings</h1>
        <p className="text-sm text-gray-500">
          Role management and configuration control
        </p>
      </div>

      {/* SETTINGS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingSections.map((s) => (
          <div
            key={s.title}
            className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                {s.icon}
              </div>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PERMISSION CONTROL */}
      <div className="bg-white border rounded-xl shadow-sm">

        <div className="p-6 border-b">
          <h3 className="font-semibold">Role-Based Access Control</h3>
        </div>

        <div className="p-6 space-y-6">

          {/* ROLE SELECTOR */}
          <div className="flex gap-4">
            {Object.keys(matrix).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedRole === role
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* MODULE GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {ALL_MODULES.map((module) => {
              const enabled = matrix[selectedRole].includes(module);

              return (
                <div
                  key={module}
                  className={`border rounded-lg p-4 flex justify-between items-center transition ${
                    enabled
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50"
                  }`}
                >
                  <span className="text-sm font-medium">{module}</span>

                  <button
                    disabled={currentUserRole !== "Admin"}
                    onClick={() =>
                      togglePermission(selectedRole, module)
                    }
                    className={`w-6 h-6 flex items-center justify-center rounded-full ${
                      enabled
                        ? "bg-green-500 text-white"
                        : "bg-gray-300 text-white"
                    } ${
                      currentUserRole !== "Admin"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {enabled ? (
                      <Check size={14} />
                    ) : (
                      <X size={14} />
                    )}
                  </button>
                </div>
              );
            })}

          </div>

          {currentUserRole !== "Admin" && (
            <p className="text-xs text-red-500">
              Only Admin can modify permissions.
            </p>
          )}

        </div>

      </div>

    </div>
  );
};

export default Settings;