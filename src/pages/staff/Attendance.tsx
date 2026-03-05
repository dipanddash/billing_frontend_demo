import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock3, Eye, EyeOff, LogOut, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = "https://billingdemo-irsxd.ondigitalocean.app";

export default function StaffAttendance() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [lastPunchText, setLastPunchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deskLoading, setDeskLoading] = useState(false);
  const [error, setError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("access");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadTodaySessions = async () => {
    setDeskLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API_BASE}/api/accounts/attendance/desk/?date=${today}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load attendance desk logs.");
      const data = (await res.json()) as Array<Record<string, unknown>>;
      const active = data.filter((row) => !row.logout_at_iso).length;
      setActiveCount(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance logs.");
    } finally {
      setDeskLoading(false);
    }
  };

  useEffect(() => {
    void loadTodaySessions();
    const timer = window.setInterval(() => {
      void loadTodaySessions();
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleAttendancePunch = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/accounts/attendance/desk/check-in/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(data?.detail ?? data?.error ?? "Invalid credentials."));
      }
      const action = String(data?.action ?? "");
      setLastPunchText(
        action === "CHECK_OUT"
          ? `${username.trim()} punched OUT successfully.`
          : `${username.trim()} punched IN successfully.`
      );
      setUsername("");
      setPassword("");
      await loadTodaySessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attendance punch failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleEndDayLogout = async () => {
    const token = localStorage.getItem("access");
    if (!token || loggingOut) return;
    try {
      setLoggingOut(true);
      await fetch(`${API_BASE}/api/accounts/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Best-effort API logout; local logout still enforced below.
    } finally {
      logout();
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-violet-200/70 bg-[linear-gradient(130deg,#ffffff_0%,#faf7ff_46%,#f4f0ff_100%)] p-6 shadow-[0_20px_50px_rgba(109,40,217,0.14)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">Attendance</p>
        <h1 className="mt-1 text-2xl font-bold text-violet-950">Attendance Login Desk</h1>
        <p className="mt-1 text-sm text-violet-700/80">
          Punch in/out with staff username and password. Attendance history is admin-only.
        </p>

        <form onSubmit={handleAttendancePunch} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Staff username"
            className="h-11 rounded-xl border border-violet-200 bg-white px-3 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-11 w-full rounded-xl border border-violet-200 bg-white pl-3 pr-10 text-sm text-violet-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-2 inline-flex items-center text-violet-600 hover:text-violet-800"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(109,40,217,0.26)] disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {loading ? "Processing..." : "Punch In / Punch Out"}
          </button>
          <div className="flex h-11 items-center rounded-xl border border-violet-200 bg-white px-3 text-sm text-violet-800">
            <Clock3 className="mr-2 h-4 w-4 text-violet-700" />
            Active Now: <b className="ml-1">{deskLoading ? "..." : activeCount}</b>
          </div>
          <div className="md:col-span-5">
            <button
              type="button"
              onClick={() => void handleEndDayLogout()}
              disabled={loggingOut}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Logging out..." : "End Day Logout"}
            </button>
          </div>
        </form>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {lastPunchText ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {lastPunchText}
          </p>
        ) : null}
      </div>
    </div>
  );
}

