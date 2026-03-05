import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BadgeCheck,
  Clock3,
  KeyRound,
  Mail,
  Phone,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";

const BASE_URL = "https://billingdemo-irsxd.ondigitalocean.app";

const API_LINKS = {
  me: `${BASE_URL}/api/accounts/me/`,
  permissions: `${BASE_URL}/api/accounts/me/permissions/`,
  recentOrders: `${BASE_URL}/api/orders/recent/?limit=6`,
  tablesList: `${BASE_URL}/api/tables/list/`,
  tokenRefresh: `${BASE_URL}/api/accounts/token/refresh/`,
};

type AnyObj = Record<string, any>;

const normalizePermissions = (payload: any): string[] => {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.permissions)
    ? payload.permissions
    : Array.isArray(payload?.data?.permissions)
    ? payload.data.permissions
    : [];

  return raw
    .map((p: any) => {
      if (typeof p === "string") return p;
      return String(p?.code ?? p?.name ?? "");
    })
    .filter(Boolean);
};

const asArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray((value as any)?.results)) return (value as any).results;
  if (Array.isArray((value as any)?.data)) return (value as any).data;
  return [];
};

const StaffProfile = () => {
  const { user, setUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [permissions, setPermissions] = useState<string[]>([]);
  const [profile, setProfile] = useState<AnyObj | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [tableStats, setTableStats] = useState({ total: 0, available: 0, occupied: 0 });

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const token = localStorage.getItem("access");

  const displayRole = useMemo(
    () => String(profile?.role ?? user?.role ?? "STAFF").replace(/_/g, " "),
    [profile?.role, user?.role]
  );

  const displayName = useMemo(
    () => form.name || user?.name || user?.username || "Staff Member",
    [form.name, user?.name, user?.username]
  );

  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "SM";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [displayName]);

  const profileCompletion = useMemo(() => {
    const checks = [form.name.trim(), form.email.trim(), form.phone.trim()];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [form]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      try {
        setError("");

        const [meRes, permsRes, recentRes, tablesRes] = await Promise.all([
          fetch(API_LINKS.me, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_LINKS.permissions, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_LINKS.recentOrders, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_LINKS.tablesList, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!meRes.ok) throw new Error("Failed to load profile details.");

        const meData = await meRes.json();
        const permsData = permsRes.ok ? await permsRes.json() : [];
        const ordersData = recentRes.ok ? await recentRes.json() : [];
        const tablesData = tablesRes.ok ? await tablesRes.json() : [];

        const resolvedName = meData?.name || meData?.full_name || meData?.username || user?.name || "";
        const resolvedEmail = meData?.email || user?.email || "";
        const resolvedPhone = meData?.phone || meData?.phone_number || "";

        const tableList = asArray(tablesData);
        const available = tableList.filter((t: any) => String(t?.status ?? "").toUpperCase() === "AVAILABLE").length;
        const occupied = tableList.filter((t: any) => String(t?.status ?? "").toUpperCase() === "OCCUPIED").length;

        setProfile(meData);
        setForm({
          name: resolvedName,
          email: resolvedEmail,
          phone: resolvedPhone,
        });
        setPermissions(normalizePermissions(permsData));
        setRecentOrders(asArray(ordersData).slice(0, 6));
        setTableStats({ total: tableList.length, available, occupied });
      } catch (e: any) {
        setError(e?.message || "Unable to fetch profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token, user?.email, user?.name]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Missing access token.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),
        full_name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };

      const res = await fetch(API_LINKS.me, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || "Failed to update profile.");
      }

      const updated = await res.json();
      const mergedUser = {
        ...user,
        ...updated,
        name: updated?.name || updated?.full_name || form.name,
        username: updated?.username || user?.username,
        email: updated?.email || form.email,
      };

      setProfile((prev) => ({ ...(prev || {}), ...updated }));
      setUser(mergedUser);
      localStorage.setItem("user", JSON.stringify(mergedUser));
      setSuccess("Profile updated successfully.");
    } catch (e: any) {
      setError(e?.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshToken = async () => {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) {
      setError("Refresh token not found.");
      return;
    }

    try {
      setRefreshing(true);
      setError("");
      const res = await fetch(API_LINKS.tokenRefresh, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (!res.ok) throw new Error("Token refresh failed.");
      const data = await res.json();
      if (data?.access) localStorage.setItem("access", data.access);
      setSuccess("Session refreshed.");
    } catch (e: any) {
      setError(e?.message || "Unable to refresh session.");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-40 animate-pulse rounded-3xl bg-violet-100/90" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-2xl bg-violet-100/80 lg:col-span-2" />
          <div className="h-96 animate-pulse rounded-2xl bg-violet-100/80" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-6">
      <div className="pointer-events-none absolute -top-16 right-0 h-56 w-56 rounded-full bg-violet-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 top-20 h-44 w-44 rounded-full bg-fuchsia-300/20 blur-3xl" />

      <section className="relative overflow-hidden rounded-3xl border border-violet-200/80 bg-[linear-gradient(120deg,#4c1d95_0%,#5b21b6_45%,#6d28d9_100%)] p-6 text-white shadow-[0_30px_70px_rgba(109,40,217,0.35)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.2),transparent_40%),radial-gradient(circle_at_85%_0%,rgba(216,180,254,0.3),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-xl font-semibold shadow-inner ring-1 ring-white/20">
              {initials}
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Staff Profile Hub
              </p>
              <h1 className="mt-2 text-2xl font-bold md:text-3xl">{displayName}</h1>
              <p className="text-sm text-white/80">Account, permissions, and live staff activity in one place.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-white/70">Role</p>
              <p className="mt-1 font-semibold">{displayRole}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-white/70">Profile Complete</p>
              <p className="mt-1 font-semibold">{profileCompletion}%</p>
            </div>
          </div>
        </div>
      </section>

      {!!error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {!!success && (
        <div className="rounded-xl border border-violet-300/70 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden border-violet-200/80 bg-white shadow-[0_18px_50px_rgba(91,33,182,0.16)] backdrop-blur lg:col-span-2">
          <CardHeader className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white">
            <CardTitle className="inline-flex items-center gap-2 text-lg">
              <UserRound className="h-4 w-4 text-violet-700" />
              Account Details
            </CardTitle>
            
          </CardHeader>
          <CardContent className="p-5 md:p-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                  <Label htmlFor="name" className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-violet-700">
                    <UserRound className="h-3.5 w-3.5" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                    className="h-11 border-violet-200 bg-white focus-visible:ring-violet-300"
                  />
                </div>

                <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                  <Label htmlFor="email" className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-violet-700">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email"
                    className="h-11 border-violet-200 bg-white focus-visible:ring-violet-300"
                  />
                </div>

                <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                  <Label htmlFor="phone" className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-violet-700">
                    <Phone className="h-3.5 w-3.5" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    className="h-11 border-violet-200 bg-white focus-visible:ring-violet-300"
                  />
                </div>

                <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                  <Label className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-violet-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Role
                  </Label>
                  <Input value={displayRole} readOnly className="h-11 border-violet-200 bg-violet-50/70" />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={refreshing}
                  onClick={handleRefreshToken}
                  className="h-11 rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {refreshing ? "Refreshing..." : "Refresh Session"}
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-[linear-gradient(120deg,#5b21b6_0%,#6d28d9_50%,#7c3aed_100%)] px-6 font-semibold text-white shadow-lg shadow-violet-400/30 hover:opacity-95"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden border-violet-200/80 bg-white shadow-[0_18px_50px_rgba(91,33,182,0.16)]">
            <CardHeader className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white">
              <CardTitle className="inline-flex items-center gap-2 text-lg">
                <KeyRound className="h-4 w-4 text-violet-700" />
                Permissions
              </CardTitle>
              
            </CardHeader>
            <CardContent className="p-5">
              {permissions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-5 text-sm text-violet-700">
                  No permissions returned for this account.
                </div>
              ) : (
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/30 px-3 py-2"
                    >
                      <span className="line-clamp-1 text-sm text-foreground">{permission}</span>
                      <Badge variant="secondary" className="ml-3 shrink-0 border-violet-200 bg-violet-100 text-violet-700">
                        <BadgeCheck className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-violet-200/80 bg-white shadow-[0_18px_50px_rgba(91,33,182,0.16)]">
            <CardHeader className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white">
              <CardTitle className="inline-flex items-center gap-2 text-lg">
                <UtensilsCrossed className="h-4 w-4 text-violet-700" />
                Shift Snapshot
              </CardTitle>
              
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border bg-background p-2">
                  <p className="text-xs text-muted-foreground">Tables</p>
                  <p className="font-semibold">{tableStats.total}</p>
                </div>
                <div className="rounded-lg border bg-background p-2">
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="font-semibold text-violet-700">{tableStats.available}</p>
                </div>
                <div className="rounded-lg border bg-background p-2">
                  <p className="text-xs text-muted-foreground">Occupied</p>
                  <p className="font-semibold text-violet-700">{tableStats.occupied}</p>
                </div>
              </div>

              <div className="space-y-2">
                {recentOrders.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent orders.</p>
                )}
                {recentOrders.map((o, idx) => (
                  <div key={String(o?.id ?? idx)} className="rounded-lg border bg-background px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">#{String(o?.order_id ?? o?.id ?? "-")}</p>
                      <Badge variant="outline" className="text-xs">
                        {String(o?.status ?? "NEW")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {String(o?.created_at ?? "").replace("T", " ").slice(0, 16) || "Just now"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;



