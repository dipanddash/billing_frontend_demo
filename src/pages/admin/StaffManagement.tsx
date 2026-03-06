import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CalendarCheck2, Check, ChevronDown, Clock3, ShieldCheck, UserCog, Users2, X } from "lucide-react";

const API_BASE = "http://192.168.1.18:8000";

type StaffStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";

interface StaffMember {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: StaffStatus;
  is_active: boolean;
  shift: string;
  joined_at: string;
  last_login?: string;
  last_logout?: string;
}

interface AttendanceLog {
  date?: string;
  staff?: string;
  staff_name?: string;
  username?: string;
  user_name?: string;
  name?: string;
  email?: string;
  role?: string;
  designation?: string;
  login_time?: string;
  check_in?: string;
  logout_time?: string | null;
  check_out?: string | null;
  last_login?: string;
  last_logout?: string | null;
}

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const statusClass: Record<StaffStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-700 border-slate-300",
  ON_LEAVE: "bg-amber-50 text-amber-700 border-amber-200",
};

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const toBool = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "active"].includes(v)) return true;
    if (["false", "0", "no", "inactive"].includes(v)) return false;
  }
  return fallback;
};

const composeDateTime = (date?: string, time?: string | null) => {
  if (!time) return undefined;
  if (!date) return String(time);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}/.test(String(time))) {
    return `${date}T${time}`;
  }
  return String(time);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const StaffManagement = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffForm, setStaffForm] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    name: "",
    email: "",
    phone: "",
    role: "STAFF",
    shift: "General",
    is_active: true,
  });
  const roleMenuRef = useRef<HTMLDivElement | null>(null);

  const getAuthHeaders = (withJson = false) => {
    const token = localStorage.getItem("access");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const apiKey = localStorage.getItem("api_key") || import.meta.env.VITE_API_KEY;
    if (apiKey) headers["X-API-KEY"] = apiKey;
    if (withJson) headers["Content-Type"] = "application/json";
    return headers;
  };

  const mapStaff = (row: Record<string, unknown>): StaffMember => {
    const user = (typeof row.user === "object" && row.user !== null ? (row.user as Record<string, unknown>) : {});
    const rawStatus = String(row.status ?? "").toUpperCase();
    const activeFlag = toBool(row.is_active, rawStatus === "ACTIVE");
    let status: StaffStatus = "ACTIVE";
    if (rawStatus === "ON_LEAVE") status = "ON_LEAVE";
    else if (rawStatus === "INACTIVE" || !activeFlag) status = "INACTIVE";
    const firstName = String(row.first_name ?? user.first_name ?? "").trim();
    const lastName = String(row.last_name ?? user.last_name ?? "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const emailText = String(row.email ?? user.email ?? "").trim();
    const emailPrefix = emailText.includes("@") ? emailText.split("@")[0] : emailText;
    const mappedName = String(
      row.name ?? row.full_name ?? user.name ?? user.full_name ?? fullName ?? row.username ?? user.username ?? emailPrefix ?? "",
    ).trim();
    const mappedPhone = String(
      row.phone ?? row.phone_number ?? row.mobile ?? row.mobile_number ?? user.phone ?? user.phone_number ?? user.mobile ?? "-",
    );

    return {
      id: String(row.id ?? row.pk ?? user.id ?? user.pk ?? ""),
      username: String(row.username ?? user.username ?? emailPrefix ?? "").trim(),
      name: mappedName || "Unknown",
      email: emailText || "-",
      phone: mappedPhone,
      role: String(row.role ?? "STAFF"),
      status,
      is_active: activeFlag,
      shift: String(row.shift ?? row.shift_name ?? "General"),
      joined_at: String(row.joined_at ?? row.date_joined ?? user.date_joined ?? ""),
      last_login: row.last_login
        ? String(row.last_login)
        : row.login_time
          ? composeDateTime(String(row.date ?? ""), String(row.login_time))
          : undefined,
      last_logout: row.last_logout
        ? String(row.last_logout)
        : row.logout_time
          ? composeDateTime(String(row.date ?? ""), String(row.logout_time))
          : row.check_out
            ? String(row.check_out)
            : undefined,
    };
  };

  const loadAttendanceLogs = async () => {
    try {
      const headers = getAuthHeaders();
      const parseList = (payload: unknown) => {
        if (Array.isArray(payload)) return { rows: payload, next: null as string | null };
        const obj = payload as { results?: unknown[]; data?: unknown[]; next?: unknown };
        const rows = Array.isArray(obj.results) ? obj.results : Array.isArray(obj.data) ? obj.data : [];
        const next = typeof obj.next === "string" && obj.next.trim() ? obj.next : null;
        return { rows, next };
      };
      const resolveNextUrl = (nextUrl: string) => {
        if (/^https?:\/\//i.test(nextUrl)) return nextUrl;
        const path = nextUrl.startsWith("/") ? nextUrl : `/${nextUrl}`;
        return `${API_BASE}${path}`;
      };

      const firstRes = await fetch(`${API_BASE}/api/reports/staff/login-logout/`, { headers });
      if (!firstRes.ok) throw new Error("Failed to fetch attendance logs");
      const firstPayload = await firstRes.json();
      const firstChunk = parseList(firstPayload);
      const mergedRows: unknown[] = [...firstChunk.rows];

      let nextUrl = firstChunk.next;
      let pageGuard = 0;
      while (nextUrl && pageGuard < 100) {
        pageGuard += 1;
        const nextRes = await fetch(resolveNextUrl(nextUrl), { headers });
        if (!nextRes.ok) break;
        const nextPayload = await nextRes.json();
        const nextChunk = parseList(nextPayload);
        mergedRows.push(...nextChunk.rows);
        nextUrl = nextChunk.next;
      }

      const sanitizedRows = mergedRows
        .filter(isRecord)
        .map((row) => ({
          date: row.date ? String(row.date) : undefined,
          staff: row.staff
            ? String(row.staff)
            : row.staff_name
              ? String(row.staff_name)
              : undefined,
          staff_name: row.staff_name ? String(row.staff_name) : undefined,
          username: row.username ? String(row.username) : undefined,
          user_name: row.user_name ? String(row.user_name) : undefined,
          name: row.name ? String(row.name) : undefined,
          email: row.email ? String(row.email) : undefined,
          role: row.role ? String(row.role) : undefined,
          designation: row.designation ? String(row.designation) : undefined,
          login_time: row.login_time
            ? String(row.login_time)
            : row.check_in
              ? String(row.check_in)
              : undefined,
          check_in: row.check_in ? String(row.check_in) : undefined,
          logout_time: row.logout_time === null || row.logout_time === undefined
            ? row.check_out === null || row.check_out === undefined
              ? undefined
              : String(row.check_out)
            : String(row.logout_time),
          check_out: row.check_out === null || row.check_out === undefined ? undefined : String(row.check_out),
          last_login: row.last_login ? String(row.last_login) : undefined,
          last_logout: row.last_logout === null || row.last_logout === undefined ? undefined : String(row.last_logout),
        }));

      setAttendanceLogs(sanitizedRows);
    } catch (err) {
      console.error(err);
      setAttendanceLogs([]);
    }
  };

  const loadStaff = async (): Promise<StaffMember[]> => {
    try {
      setFetchError(null);
      const res = await fetch(`${API_BASE}/api/accounts/staff/`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch staff");
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as { results?: unknown[] }).results)
          ? (data as { results: unknown[] }).results
          : Array.isArray((data as { data?: unknown[] }).data)
            ? (data as { data: unknown[] }).data
            : [];
      const mapped = list.map((row: Record<string, unknown>) => mapStaff(row));
      setStaff(mapped);
      if (!mapped.length) {
        setFetchError("No staff records found.");
      }
      return mapped;
    } catch (err) {
      console.error(err);
      setFetchError("Unable to fetch staff records from API.");
      setStaff([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadStaff(), loadAttendanceLogs()]);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadStaff();
      void loadAttendanceLogs();
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!roleMenuRef.current) return;
      if (!roleMenuRef.current.contains(event.target as Node)) setRoleMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const latest = staff.find((row) => row.id === selected.id);
    if (latest) setSelected(latest);
  }, [staff, selected?.id]);

  const createStaff = async () => {
    setSaving(true);
    try {
      const firstName = staffForm.first_name.trim() || staffForm.name.trim().split(" ")[0] || "";
      const lastName =
        staffForm.last_name.trim() ||
        staffForm.name
          .trim()
          .split(" ")
          .slice(1)
          .join(" ");
      const username = staffForm.username.trim() || staffForm.email.trim().split("@")[0] || "";
      const payload = {
        username,
        password: staffForm.password,
        first_name: firstName,
        last_name: lastName,
        email: staffForm.email,
        phone: staffForm.phone,
        role: staffForm.role,
        is_active: staffForm.is_active,
      };
      const res = await fetch(`${API_BASE}/api/accounts/staff/`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create staff");
      setCreateOpen(false);
      setStaffForm({
        username: "",
        password: "",
        first_name: "",
        last_name: "",
        name: "",
        email: "",
        phone: "",
        role: "STAFF",
        shift: "General",
        is_active: true,
      });
      await loadStaff();
      await loadAttendanceLogs();
    } catch (err) {
      console.error(err);
      alert("Failed to create staff.");
    } finally {
      setSaving(false);
    }
  };

  const updateStaff = async (member: StaffMember) => {
    setSaving(true);
    try {
      const parts = member.name.trim().split(/\s+/);
      const firstName = parts[0] ?? "";
      const lastName = parts.slice(1).join(" ");
      const res = await fetch(`${API_BASE}/api/accounts/staff/${member.id}/`, {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          username: member.username,
          first_name: firstName,
          last_name: lastName,
          email: member.email,
          phone: member.phone,
          role: member.role,
          is_active: member.is_active,
        }),
      });
      if (!res.ok) throw new Error("Failed to update staff");
      await loadStaff();
      await loadAttendanceLogs();
      setSelected(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update staff.");
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async (member: StaffMember) => {
    if (!confirm(`Delete ${member.name}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/staff/${member.id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete staff");
      await loadStaff();
      await loadAttendanceLogs();
      setSelected(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete staff.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStaffStatus = async (member: StaffMember) => {
    setSaving(true);
    try {
      const nextActive = !member.is_active;
      let responsePayload: Record<string, unknown> = {};
      let res = await fetch(`${API_BASE}/api/accounts/staff/${member.id}/status/`, {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ is_active: nextActive }),
      });
      if (res.ok) {
        responsePayload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      }
      if (!res.ok) {
        res = await fetch(`${API_BASE}/api/accounts/staff/${member.id}/`, {
          method: "PATCH",
          headers: getAuthHeaders(true),
          body: JSON.stringify({ is_active: nextActive }),
        });
      }
      if (!res.ok) throw new Error("Failed to update status");
      await loadStaff();
      await loadAttendanceLogs();
      setSelected((prev) => (prev ? { ...prev, is_active: nextActive, status: nextActive ? "ACTIVE" : "INACTIVE" } : null));
      if (nextActive) {
        const resetRows = Number(responsePayload.manual_closing_reset_rows ?? 0);
        if (resetRows > 0) {
          alert(`Staff reactivated. ${resetRows} manual closing row(s) for today were reset to 0 for correction.`);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update staff status.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      const term = search.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.phone.toLowerCase().includes(term);
      const matchesRole = roleFilter === "ALL" || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staff, search, roleFilter]);

  const attendanceLookup = useMemo(() => {
    const map: Record<string, { login?: string; logout?: string; rawName: string }> = {};
    const writeEntry = (keyRaw: string, entry: { login?: string; logout?: string; rawName: string }) => {
      const key = normalizeKey(keyRaw);
      if (!key) return;
      const existing = map[key];
      if (!existing) {
        map[key] = entry;
        return;
      }
      const currentTs = existing.login ? new Date(existing.login).getTime() : 0;
      const nextTs = entry.login ? new Date(entry.login).getTime() : 0;
      if (nextTs >= currentTs) map[key] = entry;
    };

    for (const row of attendanceLogs) {
      const rawName = String(row.staff ?? row.username ?? row.user_name ?? row.name ?? row.email ?? "").trim();
      if (!rawName) continue;
      const date = row.date ? String(row.date) : undefined;
      const login = composeDateTime(date, row.login_time ?? row.last_login ?? undefined);
      const logout = composeDateTime(date, row.logout_time ?? row.last_logout ?? undefined);
      const entry = { login, logout, rawName };
      const candidates = [
        String(row.staff ?? ""),
        String(row.username ?? ""),
        String(row.user_name ?? ""),
        String(row.name ?? ""),
        String(row.email ?? ""),
      ].map((v) => v.trim()).filter(Boolean);

      if (candidates.length === 0) candidates.push(rawName);
      for (const candidate of candidates) {
        writeEntry(candidate, entry);
        if (candidate.includes("@")) writeEntry(candidate.split("@")[0], entry);
      }
    }
    return map;
  }, [attendanceLogs]);

  const resolveAttendance = (member: StaffMember) => {
    const byUsername = attendanceLookup[normalizeKey(member.username)];
    if (byUsername) return byUsername;
    const byName = attendanceLookup[normalizeKey(member.name)];
    if (byName) return byName;
    const emailPrefix = member.email.includes("@") ? member.email.split("@")[0] : member.email;
    const byEmailPrefix = attendanceLookup[normalizeKey(emailPrefix)];
    if (byEmailPrefix) return byEmailPrefix;
    const all = Object.values(attendanceLookup);
    if (all.length === 1 && (member.name === "Unknown" || member.email === "-")) return all[0];
    return undefined;
  };

  const resolveDisplayName = (member: StaffMember) => {
    const direct = member.name?.trim();
    if (direct && direct.toLowerCase() !== "unknown") return direct;
    const attendanceName = resolveAttendance(member)?.rawName?.trim();
    if (attendanceName) return attendanceName;
    const emailPrefix = member.email.includes("@") ? member.email.split("@")[0] : member.email;
    return emailPrefix || "Unknown";
  };

  const handleOpenStaffDetails = async (member: StaffMember) => {
    const latest = await loadStaff();
    await loadAttendanceLogs();
    const refreshed = latest.find((s) => s.id === member.id) ?? member;
    setSelected(refreshed);
  };

  const stats = useMemo(() => {
    const active = staff.filter((s) => s.status === "ACTIVE").length;
    const onLeave = staff.filter((s) => s.status === "ON_LEAVE").length;
    const managers = staff.filter((s) => s.role === "MANAGER" || s.role === "SUPER_ADMIN" || s.role === "ADMIN").length;
    return { total: staff.length, active, onLeave, managers };
  }, [staff]);

  const attendance = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const todaysLogs = attendanceLogs.filter((row) => {
      if (row.date) return String(row.date) === todayIso;
      return Boolean(row.login_time ?? row.last_login);
    });

    const latestByStaff: Record<string, { staff: string; login?: string; logout?: string }> = {};
    for (const row of todaysLogs) {
      const staffName = String(row.staff ?? "").trim();
      if (!staffName) continue;
      const key = normalizeKey(staffName);
      const login = composeDateTime(row.date, row.login_time ?? row.last_login ?? undefined);
      const logout = composeDateTime(row.date, row.logout_time ?? row.last_logout ?? undefined);
      const current = latestByStaff[key];
      if (!current) {
        latestByStaff[key] = { staff: staffName, login, logout };
        continue;
      }
      const currentTs = current.login ? new Date(current.login).getTime() : 0;
      const nextTs = login ? new Date(login).getTime() : 0;
      if (nextTs >= currentTs) latestByStaff[key] = { staff: staffName, login, logout };
    }

    const allToday = Object.values(latestByStaff).sort((a, b) => new Date(b.login || 0).getTime() - new Date(a.login || 0).getTime());
    const recent = allToday.slice(0, 5);

    const present = allToday.length;
    const late = allToday.filter((entry) => {
      if (!entry.login) return false;
      const d = new Date(entry.login);
      return !Number.isNaN(d.getTime()) && d.getHours() >= 10;
    }).length;
    const absent = Math.max(staff.length - present, 0);

    return { present, late, absent, recent };
  }, [attendanceLogs, staff.length]);

  const roles = useMemo(() => {
    const unique = Array.from(new Set(staff.map((s) => s.role)));
    return ["ALL", ...unique];
  }, [staff]);

  const fullAttendanceHistory = useMemo(() => {
    const toName = (row: AttendanceLog) =>
      String(row.staff ?? row.username ?? row.user_name ?? row.name ?? row.email ?? "Unknown").trim() || "Unknown";
    const toRole = (row: AttendanceLog) =>
      String(row.role ?? row.designation ?? "STAFF");

    const rows = attendanceLogs.map((row, index) => {
      const login = composeDateTime(row.date, row.login_time ?? row.last_login ?? undefined);
      const logout = composeDateTime(row.date, row.logout_time ?? row.last_logout ?? undefined);
      const loginTs = login ? new Date(login).getTime() : 0;
      const logoutTs = logout ? new Date(logout).getTime() : 0;
      const sortTs = Math.max(loginTs || 0, logoutTs || 0);
      return {
        id: `${toName(row)}-${row.date ?? "na"}-${row.login_time ?? row.last_login ?? "na"}-${index}`,
        staff: toName(row),
        date: row.date ? String(row.date) : "-",
        role: toRole(row),
        login,
        logout,
        sortTs,
      };
    });

    const query = historySearch.trim().toLowerCase();
    const filteredRows = rows.filter((row) => {
      if (!query) return true;
      return (
        row.staff.toLowerCase().includes(query) ||
        row.date.toLowerCase().includes(query) ||
        row.role.toLowerCase().includes(query)
      );
    });

    return filteredRows.sort((a, b) => b.sortTs - a.sortTs);
  }, [attendanceLogs, historySearch]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-sm text-slate-600 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        Loading staff...
      </div>
    );
  }

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute -left-20 top-8 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-20 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(130deg,#ffffff_0%,#f8f7ff_45%,#f4f2ff_100%)] p-7 shadow-[0_20px_55px_rgba(76,29,149,0.1)]">
        <div className="absolute -right-10 -top-14 h-52 w-52 rounded-3xl bg-violet-200/30 blur-3xl" />
        <div className="absolute -left-14 bottom-0 h-36 w-36 rounded-3xl bg-indigo-200/25 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Admin Workforce Center</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Staff Management</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Manage staff records, roles, status and attendance flow.</p>
        </div>
      </div>

      {fetchError ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{fetchError}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Staff</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-[0_10px_24px_rgba(5,150,105,0.08)]">
          <p className="text-xs uppercase tracking-wide text-emerald-700/80">Active</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-[0_10px_24px_rgba(217,119,6,0.08)]">
          <p className="text-xs uppercase tracking-wide text-amber-700/80">On Leave</p>
          <p className="mt-1 text-3xl font-bold text-amber-700">{stats.onLeave}</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-[0_10px_24px_rgba(124,58,237,0.1)]">
          <p className="text-xs uppercase tracking-wide text-violet-700/80">Managers/Admins</p>
          <p className="mt-1 text-3xl font-bold text-violet-700">{stats.managers}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <CalendarCheck2 className="h-4 w-4" />
            Attendance Today
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{attendance.present}</p>
          <p className="text-xs text-slate-500">Checked in staff</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <Clock3 className="h-4 w-4" />
            Late Arrivals
          </p>
          <p className="mt-3 text-3xl font-bold text-amber-700">{attendance.late}</p>
          <p className="text-xs text-slate-500">Check-in after 10:00 AM</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <Users2 className="h-4 w-4" />
            Absent Today
          </p>
          <p className="mt-3 text-3xl font-bold text-rose-700">{attendance.absent}</p>
          <p className="text-xs text-slate-500">No activity logged today</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-violet-200/70 bg-[linear-gradient(130deg,#ffffff_0%,#faf7ff_46%,#f4f0ff_100%)] p-6 shadow-[0_20px_50px_rgba(109,40,217,0.14)]">
        <div className="absolute -right-12 -top-16 h-52 w-52 rounded-3xl bg-violet-300/25 blur-3xl" />
        <div className="absolute -left-8 -bottom-10 h-40 w-40 rounded-3xl bg-indigo-300/20 blur-3xl" />
        <div className="relative mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">Live Feed</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Recent Staff Check-ins</h2>
          </div>
          <span className="rounded-lg border border-violet-200 bg-white/90 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
            {attendance.recent.length} Active Logs
          </span>
        </div>
        {attendance.recent.length === 0 ? (
          <p className="text-sm text-slate-500">No attendance logs found for today.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attendance.recent.map((entry) => (
              <div
                key={entry.staff}
                className="group relative overflow-hidden rounded-2xl border border-violet-200/70 bg-white/95 px-4 py-3 shadow-[0_10px_24px_rgba(109,40,217,0.1)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(109,40,217,0.16)]"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-500 to-indigo-500" />
                <p className="pl-2 text-sm font-semibold text-slate-900">{entry.staff}</p>
                <div className="mt-1 grid grid-cols-1 gap-1 pl-2 text-xs text-slate-600">
                  <p>
                    <span className="font-semibold text-emerald-700">In</span>: {formatDateTime(entry.login)}
                  </p>
                  <p>
                    <span className="font-semibold text-indigo-700">Out</span>: {formatDateTime(entry.logout)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">Attendance Audit</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Full Staff Login/Logout History</h2>
            <p className="text-xs text-slate-500">Shows all fetched records in reverse chronological order.</p>
          </div>
          <div className="w-full max-w-xs">
            <input
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search staff/date/role"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-violet-500"
            />
          </div>
        </div>

        {fullAttendanceHistory.length === 0 ? (
          <p className="text-sm text-slate-500">No attendance history records found.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Login</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Logout</th>
                </tr>
              </thead>
              <tbody>
                {fullAttendanceHistory.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{entry.staff}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{entry.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{entry.role}</td>
                    <td className="px-4 py-3 text-sm text-emerald-700">{formatDateTime(entry.login)}</td>
                    <td className="px-4 py-3 text-sm text-indigo-700">{formatDateTime(entry.logout)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    <div className="relative overflow-hidden rounded-[32px] border border-violet-200/60 bg-gradient-to-br from-white via-violet-50/40 to-indigo-50/40 p-8 shadow-[0_30px_80px_rgba(91,33,182,0.18)]">

  {/* HEADER */}
  <div className="mb-8 flex items-center justify-between">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
        Workforce Control
      </p>
      <h3 className="mt-2 text-2xl font-bold text-slate-900">
        Staff Intelligence Grid
      </h3>
    </div>

    <div className="flex items-center gap-3">
      <div ref={roleMenuRef} className="relative">
        <button
          type="button"
          onClick={() => setRoleMenuOpen((prev) => !prev)}
          className="min-w-44 rounded-2xl border border-violet-300 bg-white px-4 py-2.5 text-left text-sm font-semibold text-slate-800 shadow-[0_8px_20px_rgba(124,58,237,0.12)] transition hover:border-violet-400 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-200"
        >
          <span>{roleFilter === "ALL" ? "All Roles" : roleFilter}</span>
          <ChevronDown className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-700 transition ${roleMenuOpen ? "rotate-180" : ""}`} />
        </button>
        {roleMenuOpen ? (
          <div className="absolute left-0 top-[calc(100%+8px)] z-30 min-w-44 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-[0_20px_40px_rgba(91,33,182,0.2)]">
            {roles.map((role) => {
              const active = roleFilter === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setRoleFilter(role);
                    setRoleMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                      : "text-slate-700 hover:bg-violet-50"
                  }`}
                >
                  <span>{role === "ALL" ? "All Roles" : role}</span>
                  {active ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <button
        onClick={() => setCreateOpen(true)}
        className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:scale-[1.03] transition"
      >
        Add Staff
      </button>
    </div>
  </div>

  {/* ADVANCED GRID (Not basic table anymore) */}
  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
    {filtered.length === 0 ? (
      <div className="col-span-full rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
        No staff records to show.
      </div>
    ) : filtered.map((member) => (
      <div
        key={member.id}
        className="group relative rounded-2xl border border-violet-200 bg-white/90 p-6 shadow-md transition hover:-translate-y-1 hover:shadow-[0_25px_50px_rgba(109,40,217,0.2)]"
      >
        {/* Status Glow */}
        <div className="absolute right-4 top-4">
          <span
            className={`h-3 w-3 rounded-full ${
              member.status === "ACTIVE"
                ? "bg-emerald-500"
                : member.status === "ON_LEAVE"
                ? "bg-amber-500"
                : "bg-slate-400"
            }`}
          />
        </div>

        <h4 className="text-lg font-bold text-slate-900">
          {resolveDisplayName(member)}
        </h4>

        <p className="mt-1 text-xs text-slate-500">{member.email}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-400 text-xs">Role</p>
            <p className="font-semibold text-slate-800">{member.role}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Shift</p>
            <p className="font-semibold text-slate-800">{member.shift}</p>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-600">
          <p>
            <span className="font-semibold text-emerald-600">In:</span>{" "}
            {formatDateTime(resolveAttendance(member)?.login ?? member.last_login)}
          </p>
          <p>
            <span className="font-semibold text-indigo-600">Out:</span>{" "}
            {formatDateTime(resolveAttendance(member)?.logout ?? member.last_logout)}
          </p>
        </div>

        <button
          onClick={() => void handleOpenStaffDetails(member)}
          className="mt-5 w-full rounded-xl border border-violet-300 bg-violet-50 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
        >
          View Profile
        </button>
      </div>
    ))}
  </div>
</div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_35px_90px_rgba(15,23,42,0.4)]">
            <div className="relative overflow-hidden bg-[linear-gradient(120deg,#111827_0%,#312e81_55%,#4f46e5_100%)] px-6 py-5 text-white">
              <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200">Staff Profile</p>
                  <h3 className="mt-1 text-2xl font-bold">{resolveDisplayName(selected)}</h3>
                  <p className="text-sm text-indigo-100/90">{selected.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-white/35 bg-white/10 p-2 text-white transition hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Username</p>
                    <p className="mt-1 font-semibold text-slate-900">{selected.username || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <p className={`mt-1 font-semibold ${selected.is_active ? "text-emerald-700" : "text-slate-600"}`}>
                      {selected.is_active ? "ACTIVE" : "INACTIVE"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Joined</p>
                    <p className="mt-1 font-semibold text-slate-900">{formatDate(selected.joined_at)}</p>
                  </div>
                </div>
              </aside>

              <section className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    value={selected.name}
                    onChange={(e) => setSelected((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                    placeholder="Full Name"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
                  />
                  <input
                    value={selected.username}
                    onChange={(e) => setSelected((prev) => (prev ? { ...prev, username: e.target.value } : prev))}
                    placeholder="Username"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
                  />
                  <input
                    value={selected.email}
                    onChange={(e) => setSelected((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
                    placeholder="Email"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
                  />
                  <input
                    value={selected.phone}
                    onChange={(e) => setSelected((prev) => (prev ? { ...prev, phone: e.target.value } : prev))}
                    placeholder="Phone"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
                  />
                  <select
                    value={selected.role}
                    onChange={(e) => setSelected((prev) => (prev ? { ...prev, role: e.target.value } : prev))}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="ACCOUNTANT">ACCOUNTANT</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <select
                    value={selected.shift}
                    onChange={(e) => setSelected((prev) => (prev ? { ...prev, shift: e.target.value } : prev))}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="Morning">Morning</option>
                    <option value="General">General</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Last Login</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-900">
                      {formatDateTime(resolveAttendance(selected)?.login ?? selected.last_login)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Last Logout</p>
                    <p className="mt-1 text-sm font-semibold text-indigo-900">
                      {formatDateTime(resolveAttendance(selected)?.logout ?? selected.last_logout)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => toggleStaffStatus(selected)}
                    className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
                  >
                    {selected.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => updateStaff(selected)}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => deleteStaff(selected)}
                    className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-200 bg-purple-50 px-5 py-4">
              <h3 className="text-lg font-semibold text-purple-950">Create Staff</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-md border border-purple-200 p-1.5 text-purple-700 hover:bg-purple-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
              <input
                value={staffForm.first_name}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, first_name: e.target.value }))}
                placeholder="First Name"
                className="rounded-md border border-purple-200 px-3 py-2 text-sm"
              />
              <input
                value={staffForm.last_name}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, last_name: e.target.value }))}
                placeholder="Last Name"
                className="rounded-md border border-purple-200 px-3 py-2 text-sm"
              />
              <input
                value={staffForm.username}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Username"
                className="rounded-md border border-purple-200 px-3 py-2 text-sm"
              />
              <input
                type="password"
                value={staffForm.password}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Password"
                className="rounded-md border border-purple-200 px-3 py-2 text-sm"
              />
              <input
                value={staffForm.email}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                className="rounded-md border border-purple-200 px-3 py-2 text-sm"
              />
              <input
                value={staffForm.phone}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone"
                className="rounded-md border border-purple-200 px-3 py-2 text-sm"
              />
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, role: e.target.value }))}
                className="rounded-md border border-purple-200 px-3 py-2 text-sm md:col-span-2"
              >
                <option value="STAFF">STAFF</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ACCOUNTANT">ACCOUNTANT</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-purple-200 px-5 py-4">
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-md border border-purple-200 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-100"
              >
                Cancel
              </button>
              <button
                onClick={createStaff}
                disabled={saving || !staffForm.username || !staffForm.password || !staffForm.first_name || !staffForm.email}
                className="rounded-md bg-purple-700 px-3 py-2 text-xs font-medium text-white hover:bg-purple-800 disabled:opacity-60"
              >
                Create Staff
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StaffManagement;


