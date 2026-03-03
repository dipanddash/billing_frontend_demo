import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserRound, Mail, BadgeCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  REPORT_DEFINITIONS,
  fetchStaffReportAccess,
  fetchStaffUsers,
  saveStaffReportAccess,
  type StaffReportAccessByKey,
  type StaffUserOption,
} from "@/lib/reportsConfig";

const API_BASE = "http://192.168.1.18:8000";

type AccessConfig = {
  roleLabel: string;
  capabilities: string[];
  accessScope: string[];
};

type ProfileData = {
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
  last_login?: string;
  date_joined?: string;
};

const AdminProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData>({});
  const [form, setForm] = useState({ name: "", phone: "" });
  const [permissions, setPermissions] = useState<AccessConfig>({
    roleLabel: "ADMIN",
    capabilities: [],
    accessScope: [],
  });
  const [staffUsers, setStaffUsers] = useState<StaffUserOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffReportAccess, setStaffReportAccess] = useState<StaffReportAccessByKey>({});
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  const getAuthHeaders = (withJson = false) => {
    const token = localStorage.getItem("access");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    if (withJson) headers["Content-Type"] = "application/json";
    return headers;
  };

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const [meRes, permissionRes] = await Promise.all([
          fetch(`${API_BASE}/api/accounts/me/`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/api/accounts/me/permissions/`, { headers: getAuthHeaders() }),
        ]);

        if (!meRes.ok) throw new Error(`Profile request failed (${meRes.status})`);
        const meData = await meRes.json();

        const normalizedMe: ProfileData = {
          id: String(meData.id ?? ""),
          username: String(meData.username ?? ""),
          name: String(meData.name ?? meData.full_name ?? meData.username ?? ""),
          email: String(meData.email ?? ""),
          phone: String(meData.phone ?? ""),
          role: String(meData.role ?? meData.user_type ?? user?.role ?? "ADMIN"),
          is_active: Boolean(meData.is_active ?? true),
          last_login: meData.last_login ? String(meData.last_login) : undefined,
          date_joined: meData.date_joined ? String(meData.date_joined) : undefined,
        };
        setProfile(normalizedMe);
        setForm({
          name: normalizedMe.name ?? "",
          phone: normalizedMe.phone ?? "",
        });

        if (permissionRes.ok) {
          const permissionData = await permissionRes.json();
          setPermissions({
            roleLabel: String(permissionData.role ?? normalizedMe.role ?? "ADMIN"),
            capabilities: Array.isArray(permissionData.capabilities) ? permissionData.capabilities.map(String) : [],
            accessScope: Array.isArray(permissionData.modules) ? permissionData.modules.map(String) : [],
          });
        } else {
          setPermissions({
            roleLabel: String(normalizedMe.role ?? "ADMIN"),
            capabilities: [],
            accessScope: [],
          });
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [user?.role]);

  useEffect(() => {
    const loadStaffUsers = async () => {
      try {
        const token = localStorage.getItem("access");
        if (!token) return;
        const users = await fetchStaffUsers(token);
        setStaffUsers(users);
        if (users.length && !selectedStaffId) {
          setSelectedStaffId(users[0].id);
        }
      } catch (err) {
        console.error(err);
        setStaffUsers([]);
      }
    };
    void loadStaffUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadStaffAccess = async () => {
      if (!selectedStaffId) return;
      try {
        const token = localStorage.getItem("access");
        if (!token) return;
        const access = await fetchStaffReportAccess(token, selectedStaffId);
        setStaffReportAccess(access);
      } catch (err) {
        console.error(err);
      }
    };
    void loadStaffAccess();
  }, [selectedStaffId]);

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/me/`, {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
        }),
      });
      if (!res.ok) throw new Error(`Profile update failed (${res.status})`);
      const updated = await res.json();
      setProfile((prev) => ({
        ...prev,
        name: String(updated.name ?? updated.full_name ?? form.name),
        phone: String(updated.phone ?? form.phone),
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const selectedStaffUsername = useMemo(
    () => staffUsers.find((u) => u.id === selectedStaffId)?.username ?? "",
    [staffUsers, selectedStaffId],
  );

  const handleSaveStaffReportAccess = async () => {
    if (!selectedStaffId) return;
    try {
      const token = localStorage.getItem("access");
      if (!token) return;
      await saveStaffReportAccess(token, selectedStaffId, staffReportAccess);
      setAccessMessage(`Saved report access for ${selectedStaffUsername || "selected staff"}.`);
      window.setTimeout(() => setAccessMessage(null), 2200);
    } catch (err) {
      console.error(err);
      setAccessMessage("Failed to save report access.");
      window.setTimeout(() => setAccessMessage(null), 2200);
    }
  };

  const displayName = useMemo(
    () => profile.name || profile.username || user?.name || user?.username || user?.email || "-",
    [profile.name, profile.username, user]
  );

  const displayEmail = useMemo(
    () => profile.email || user?.email || "-",
    [profile.email, user]
  );

  const displayRole = useMemo(
    () => permissions.roleLabel || profile.role || user?.role || "ADMIN",
    [permissions.roleLabel, profile.role, user?.role]
  );

  const access = useMemo(
    () => ({
      roleLabel: displayRole,
      capabilities: permissions.capabilities.length
        ? permissions.capabilities
        : ["Capabilities are not provided by /api/accounts/me/permissions/."],
      accessScope: permissions.accessScope,
    }),
    [displayRole, permissions]
  );

  if (loading) {
    return <div className="p-6 text-sm">Loading profile...</div>;
  }

  return (
    <div className="relative space-y-6 overflow-hidden p-1">
      <div className="pointer-events-none absolute -left-20 top-2 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-3xl border border-violet-200/70 bg-[linear-gradient(130deg,#ffffff_0%,#f8f6ff_48%,#f2eeff_100%)] p-6 shadow-[0_20px_55px_rgba(76,29,149,0.12)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">Admin Identity</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-600">User details, role capabilities, and access scope.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-violet-200 bg-white/90 px-3 py-1 text-xs font-medium text-violet-700">
            {displayName}
          </span>
          <span className="rounded-full border border-violet-200 bg-white/90 px-3 py-1 text-xs font-medium text-violet-700">
            {displayRole}
          </span>
          <span className="rounded-full border border-violet-200 bg-white/90 px-3 py-1 text-xs font-medium text-violet-700">
            {profile.is_active ? "Active Account" : "Inactive Account"}
          </span>
        </div>
        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
              <UserRound className="h-4 w-4" />
              Name
            </p>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-violet-200 bg-violet-50/40 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-300/40"
            />
          </div>
          <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
              <Mail className="h-4 w-4" />
              Email
            </p>
            <p className="text-sm font-semibold text-slate-900 break-all">{displayEmail}</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
              <ShieldCheck className="h-4 w-4" />
              Role
            </p>
            <p className="text-sm font-semibold text-slate-900">{access.roleLabel}</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)] md:col-span-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">Phone</p>
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-xl border border-violet-200 bg-violet-50/40 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-300/40"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(79,70,229,0.24)] transition hover:opacity-95 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-violet-200/70 bg-white p-5 shadow-[0_12px_26px_rgba(15,23,42,0.08)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700">Capabilities</h2>
          <div className="mt-3 space-y-2">
            {access.capabilities.map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2 text-sm text-slate-700">
                <BadgeCheck className="mt-0.5 h-4 w-4 text-violet-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-violet-200/70 bg-white p-5 shadow-[0_12px_26px_rgba(15,23,42,0.08)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700">Accessible Modules</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {access.accessScope.length ? (
              access.accessScope.map((moduleName) => (
                <span
                  key={moduleName}
                  className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
                >
                  {moduleName}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">No modules returned by `/api/accounts/me/permissions/`.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-violet-200/70 bg-white p-5 shadow-[0_12px_26px_rgba(15,23,42,0.08)]">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700">Account Metadata</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Username</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{profile.username || displayName}</p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Status</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{profile.is_active ? "Active" : "Inactive"}</p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Date Joined</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{profile.date_joined || "-"}</p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Last Login</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{profile.last_login || "-"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-violet-200/70 bg-white p-5 shadow-[0_12px_26px_rgba(15,23,42,0.08)]">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700">Staff Report Access Control</h2>
        <p className="mt-1 text-xs text-slate-500">
          Assign report permissions per staff user. Only assigned reports appear in staff reports page.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="h-11 rounded-xl border border-violet-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-300/40"
          >
            {!staffUsers.length ? <option value="">No staff users</option> : null}
            {staffUsers.map((staffUser) => (
              <option key={staffUser.id} value={staffUser.id}>{staffUser.username}</option>
            ))}
          </select>
          <button
            onClick={() => void handleSaveStaffReportAccess()}
            disabled={!selectedStaffId}
            className="rounded-xl bg-[linear-gradient(135deg,#7c3aed_0%,#5b21b6_100%)] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(79,70,229,0.24)] disabled:opacity-50"
          >
            Save Report Access
          </button>
          {accessMessage ? <p className="text-xs text-emerald-700">{accessMessage}</p> : null}
        </div>

        {selectedStaffId ? (
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {REPORT_DEFINITIONS.map((report) => {
              const isChecked = staffReportAccess[report.key] === true;
              return (
                <label
                  key={report.key}
                  className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    isChecked
                      ? "border-violet-300 bg-violet-50 shadow-[0_8px_18px_rgba(109,40,217,0.12)]"
                      : "border-violet-100 bg-violet-50/45 hover:border-violet-300 hover:bg-violet-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setStaffReportAccess((prev) => ({
                          ...prev,
                          [report.key]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 h-5 w-5 rounded-md border-2 border-violet-300 text-violet-600 focus:ring-2 focus:ring-violet-300"
                    />
                    <span>
                      <span className="font-semibold text-slate-900">{report.name}</span>
                      <span className="block text-xs text-slate-500">{report.desc}</span>
                    </span>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      isChecked
                        ? "border-violet-300 bg-white text-violet-700"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {isChecked ? "Enabled" : "Disabled"}
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AdminProfile;

