import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Clock3, Eye, EyeOff, LogOut, UserPlus } from "lucide-react";

const API_BASE = "http://192.168.1.18:8000";

type AttendanceSession = {
  id: number;
  username: string;
  loginAt: string;
  logoutAt?: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const formatWorked = (loginAt: string, logoutAt?: string) => {
  const start = new Date(loginAt).getTime();
  const end = new Date(logoutAt || Date.now()).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "-";
  const mins = Math.floor((end - start) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

export default function StaffAttendance() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const authHeaders = () => {
    const token = localStorage.getItem("access");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadTodaySessions = async () => {
    setTableLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API_BASE}/api/accounts/attendance/desk/?date=${today}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load attendance desk logs.");
      const data = (await res.json()) as Array<Record<string, unknown>>;
      const mapped = data.map((row) => ({
        id: Number(row.id),
        username: String(row.staff ?? ""),
        loginAt: String(row.login_at_iso ?? ""),
        logoutAt: row.logout_at_iso ? String(row.logout_at_iso) : undefined,
      }));
      setSessions(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance logs.");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    void loadTodaySessions();
    const timer = window.setInterval(() => {
      void loadTodaySessions();
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleAttendanceLogin = async (e: FormEvent) => {
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
      setUsername("");
      setPassword("");
      await loadTodaySessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attendance login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceLogout = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/accounts/attendance/desk/check-out/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(data?.detail ?? data?.error ?? "Failed to logout attendance session."));
      }
      await loadTodaySessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attendance logout failed.");
    }
  };

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySessions = useMemo(
    () =>
      sessions.filter((s) => {
        const day = new Date(s.loginAt).toISOString().slice(0, 10);
        return day === todayKey;
      }),
    [sessions, todayKey]
  );
  const activeCount = todaySessions.filter((s) => !s.logoutAt).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-violet-200/70 bg-[linear-gradient(130deg,#ffffff_0%,#faf7ff_46%,#f4f0ff_100%)] p-6 shadow-[0_20px_50px_rgba(109,40,217,0.14)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">Attendance</p>
        <h1 className="mt-1 text-2xl font-bold text-violet-950">Attendance Login Desk</h1>
        <p className="mt-1 text-sm text-violet-700/80">
          Only entries created on this page are shown here. Full login/logout history is admin-only.
        </p>

        <form onSubmit={handleAttendanceLogin} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
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
            {loading ? "Logging..." : "Login For Attendance"}
          </button>
          <div className="flex h-11 items-center rounded-xl border border-violet-200 bg-white px-3 text-sm text-violet-800">
            <Clock3 className="mr-2 h-4 w-4 text-violet-700" />
            Active Today: <b className="ml-1">{activeCount}</b>
          </div>
        </form>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-violet-200/70 bg-white p-5 shadow-[0_18px_45px_rgba(109,40,217,0.12)]">
        {tableLoading ? (
          <p className="text-sm text-violet-700/80">Loading attendance entries...</p>
        ) : todaySessions.length === 0 ? (
          <p className="text-sm text-violet-700/80">No attendance entries yet for today.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-violet-200">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-violet-200 bg-violet-50/70">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-violet-700">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-violet-700">Login</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-violet-700">Logout</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-violet-700">Worked</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-violet-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {todaySessions.map((s) => (
                  <tr key={s.id} className="border-b border-violet-100 hover:bg-violet-50/40">
                    <td className="px-4 py-3 text-sm font-semibold text-violet-950">{s.username}</td>
                    <td className="px-4 py-3 text-sm text-emerald-700">{formatDateTime(s.loginAt)}</td>
                    <td className="px-4 py-3 text-sm text-indigo-700">{formatDateTime(s.logoutAt)}</td>
                    <td className="px-4 py-3 text-sm text-violet-900">{formatWorked(s.loginAt, s.logoutAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      {!s.logoutAt ? (
                        <button
                          onClick={() => handleAttendanceLogout(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Logout
                        </button>
                      ) : (
                        <span className="text-xs text-violet-400">Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
