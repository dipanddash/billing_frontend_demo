import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { handleEnterPrimaryAction } from "@/lib/enterAction";
import { LogOut, ChevronDown, User, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
  
interface NavItem {
  label: string;
  path: string;
}

const staffNav: NavItem[] = [
  { label: 'Dashboard', path: '/staff' },
  { label: 'POS', path: '/staff/pos' },
  { label: 'Tables', path: '/staff/tables' },
  { label: 'Kitchen', path: '/staff/kitchen' },
  { label: 'Orders', path: '/staff/orders' },
  { label: 'Purchase', path: '/staff/purchase-entry' },
  { label: 'Attendance', path: '/staff/attendance' },
  { label: 'Closing', path: '/staff/manual-closing' },
  { label: 'Reports', path: '/staff/reports' },

];

const StaffLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [showApiLoader, setShowApiLoader] = useState(false);
  const activeRequestsRef = useRef(0);
  const loaderTimerRef = useRef<number | null>(null);
  const displayName = user?.name || user?.username || user?.email || "Staff User";
  const isKitchenRoute = location.pathname.startsWith("/staff/kitchen");

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const LOADER_DELAY_MS = 450;

    const getRequestUrl = (input: RequestInfo | URL) => {
      if (typeof input === "string") return input;
      if (input instanceof Request) return input.url;
      return String(input);
    };

    const shouldTrackRequest = (url: string) =>
      url.includes("/api/") && !window.location.pathname.startsWith("/staff/kitchen");

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
    if (!isKitchenRoute) return;
    if (loaderTimerRef.current !== null) {
      window.clearTimeout(loaderTimerRef.current);
      loaderTimerRef.current = null;
    }
    setShowApiLoader(false);
  }, [isKitchenRoute]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      handleEnterPrimaryAction(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLogout = async () => {
  const token = localStorage.getItem("access");

  if (token) {
    try {
      await fetch("https://demo-j5fde.ondigitalocean.app/api/accounts/logout/", {
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

  const handleNewOrderRoute = (kind: "DINE_IN" | "TAKEAWAY" | "SWIGGY" | "ZOMATO") => {
    setNewOrderOpen(false);
    if (kind === "DINE_IN") {
      navigate("/staff/tables");
      return;
    }
    navigate(`/staff/pos?new_order=${encodeURIComponent(kind.toLowerCase())}`);
  };

  return (
    <div className="min-h-screen bg-white">
      
      {/* FIXED SOLID HEADER */}
      <header className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-10xl px-4 py-1">
          <nav className="rounded-2xl bg-white px-4 py-2 flex items-center justify-between">

                        {/* LOGO */}
            <Link to="/staff" className="flex items-center gap-2">
              <img
                src="/dip%20and%20dash.png"
                alt="Dip & Dash"
                className="h-16 w-auto object-contain"
              />
            </Link>

            {/* CENTER NAVIGATION */}
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setNewOrderOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
                    newOrderOpen
                      ? "gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Plus className="w-1 h-2" />
                New Order
                </button>
                {newOrderOpen && (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-44 overflow-hidden rounded-xl border border-violet-200 bg-white py-1 shadow-xl">
                    <button
                      onClick={() => handleNewOrderRoute("DINE_IN")}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-violet-50"
                    >
                      Dine In
                    </button>
                    <button
                      onClick={() => handleNewOrderRoute("TAKEAWAY")}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-violet-50"
                    >
                      Takeaway
                    </button>
                    <button
                      onClick={() => handleNewOrderRoute("SWIGGY")}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-violet-50"
                    >
                      Swiggy
                    </button>
                    <button
                      onClick={() => handleNewOrderRoute("ZOMATO")}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-violet-50"
                    >
                      Zomato
                    </button>
                  </div>
                )}
              </div>
              {staffNav.map((item) => {
                const isActive =
                  item.path === "/staff"
                    ? location.pathname === "/staff"
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
                        {String(user?.role ?? "STAFF").replace(/_/g, " ")}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/staff/profile");
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

export default StaffLayout;



