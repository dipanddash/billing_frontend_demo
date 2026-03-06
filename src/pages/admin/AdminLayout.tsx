import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { handleEnterPrimaryAction } from "@/lib/enterAction";
import { LogOut, ChevronDown, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
  
interface NavItem {
  label: string;
  path: string;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", path: "/admin" },
  { label: "Invoices", path: "/admin/invoices" },
  { label: "Products", path: "/admin/products" },
  { label: "Coupons", path: "/admin/coupons" },
  { label: "Customers", path: "/admin/customers" },
  { label: "Vendors", path: "/admin/vendors" },
  { label: "Reports", path: "/admin/reports" },
  { label: "Inventory", path: "/admin/inventory" },
  { label: "Assets", path: "/admin/assets" },
  { label: "Stock Audit Report", path: "/admin/stock-audit" },
  { label: "Staff", path: "/admin/staff" },
];


const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [showApiLoader, setShowApiLoader] = useState(false);
  const activeRequestsRef = useRef(0);
  const loaderTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const LOADER_DELAY_MS = 450;
    const API_ORIGIN = "http://192.168.1.18:8000";

    const getRequestUrl = (input: RequestInfo | URL) => {
      if (typeof input === "string") return input;
      if (input instanceof Request) return input.url;
      return String(input);
    };

    const shouldTrackRequest = (url: string) => {
      if (!url) return false;
      if (url.includes("/api/")) return true;
      // Track backend calls even when endpoint path does not include "/api/".
      return url.startsWith(API_ORIGIN);
    };

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const requestUrl = getRequestUrl(args[0]);
      const trackThisRequest = shouldTrackRequest(requestUrl);

      if (trackThisRequest) {
        activeRequestsRef.current += 1;

        if (activeRequestsRef.current === 1) {
          loaderTimerRef.current = window.setTimeout(() => {
            if (activeRequestsRef.current > 0) {
              setShowApiLoader(true);
            }
          }, LOADER_DELAY_MS);
        }
      }

      try {
        return await originalFetch(...args);
      } finally {
        if (trackThisRequest) {
          activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);

          if (activeRequestsRef.current === 0) {
            if (loaderTimerRef.current !== null) {
              window.clearTimeout(loaderTimerRef.current);
              loaderTimerRef.current = null;
            }
            setShowApiLoader(false);
          }
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
      if (loaderTimerRef.current !== null) {
        window.clearTimeout(loaderTimerRef.current);
      }
      activeRequestsRef.current = 0;
      setShowApiLoader(false);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      handleEnterPrimaryAction(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const displayName = (() => {
    const candidate =
      user?.name ??
      user?.username;

    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();

    const email = user?.email;
    if (typeof email === "string" && email.includes("@")) return email.split("@")[0];

    return "Admin User";
  })();

  const displayRole = String(
    user?.role ?? "ADMIN",
  ).replace(/_/g, " ");

 const handleLogout = async () => {
  const token = localStorage.getItem("access");

  if (token) {
    try {
      await fetch("http://192.168.1.18:8000/api/accounts/logout/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      console.error("Logout API failed:", e);
    }
  }

  logout();       // clear local auth
  navigate("/");
};

  return (
    <div className="min-h-screen bg-white">
      
      {/* FIXED SOLID HEADER */}
      <header className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-10xl px-4 py-1.0">
          <nav className="rounded-2xl bg-white px-4 py-2 flex items-center justify-between">

                        {/* LOGO */}
            <Link to="/admin" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="CAFEFLOW"
                className="h-12 w-auto object-contain"
              />
            </Link>

            {/* CENTER NAVIGATION */}
            <div className="flex items-center gap-1">
              {adminNav.map((item) => {
                const isActive =
                  item.path === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? "gradient-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* RIGHT SECTION */}
            <div className="flex items-center gap-1.5">
              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-slate-100"
                >
                  <span className="max-w-[140px] truncate text-xs font-medium text-slate-700">
                    {displayName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-3 w-48 rounded-xl shadow-xl border border-slate-200 bg-white py-2 z-50">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-xs font-medium text-foreground">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {displayRole}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/admin/profile");
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> Profile
                    </button>

                   

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>

          </nav>
        </div>
      </header>

      {/* CONTENT */}
      <main className="w-full px-6 py-8 pt-20 bg-white">
        <Outlet />
      </main>

      {showApiLoader && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 shadow-xl">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
            <p className="text-sm font-medium text-slate-800">Loading data...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;





