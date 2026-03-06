import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Globe, ShieldCheck, Zap } from "lucide-react";
const loginHeroImage = "/login-hero-food.jpeg";
const logoWatermark = "/dip%20and%20dash.png";

const Login = () => {
  const { setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "STAFF">("ADMIN");
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const navigate = useNavigate();
  const extractErrorMessage = (payload: unknown, fallback: string) => {
    const obj = payload as Record<string, unknown>;
    const detail = obj?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length > 0) return String(detail[0]);
    if (typeof obj?.error === "string" && obj.error.trim()) return obj.error;
    if (typeof obj?.non_field_errors === "string" && obj.non_field_errors.trim()) return obj.non_field_errors;
    if (Array.isArray(obj?.non_field_errors) && obj.non_field_errors.length > 0) return String(obj.non_field_errors[0]);
    return fallback;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningIn) return;
    setError("");
    setIsSigningIn(true);

    try {
      const loginResponse = await fetch("http://192.168.1.18:8000/api/accounts/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(extractErrorMessage(loginData, "Invalid credentials"));
      }

      const tokenResponse = await fetch("http://192.168.1.18:8000/api/accounts/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        const message = extractErrorMessage(tokenData, "Token generation failed");
        if (message.toLowerCase().includes("no active account")) {
          throw new Error("Can't login for the day. Ask admin to activate your account.");
        }
        throw new Error(message);
      }

      const role = loginData.role?.toUpperCase().trim();
      if (selectedRole === "ADMIN" && role === "STAFF") {
        setError("This account is staff. Select Staff tab to continue.");
        return;
      }
      if (selectedRole === "STAFF" && role !== "STAFF") {
        setError("This account is admin. Select Admin tab to continue.");
        return;
      }

      localStorage.setItem("access", tokenData.access);
      localStorage.setItem("refresh", tokenData.refresh);
      localStorage.setItem("user", JSON.stringify(loginData));
      setUser(loginData);

      if (role === "STAFF") {
        navigate("/staff", { replace: true });
      } else {
        navigate("/admin", { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#efebf9]">
      <div className="grid min-h-screen w-full overflow-hidden lg:grid-cols-2">
        <section
          className="relative hidden lg:block"
          style={{
            backgroundImage: `linear-gradient(120deg,rgba(79,33,157,0.34),rgba(120,67,217,0.26)), url(${loginHeroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.10),transparent_42%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white xl:p-12">
            <div className="inline-flex w-fit items-center gap-3  px-4 py-3 backdrop-blur-sm">
             
             
            </div>

            <div>
              <h2 className="max-w-xl text-5xl font-bold leading-[1.04] tracking-tight">
                Manage your cafe like never before.
              </h2>
              <p className="mt-4 max-w-lg text-base text-white/85">
                Enterprise-grade billing, operations, and realtime staff workflow across locations.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-white/35 bg-white/15 px-3 py-1.5">Enterprise Security</span>
                <span className="rounded-full border border-white/35 bg-white/15 px-3 py-1.5">Realtime Sync</span>
                <span className="rounded-full border border-white/35 bg-white/15 px-3 py-1.5">Multi-location</span>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#f6f3fc] px-4 py-8 sm:px-7 lg:px-10">
          <div className="relative isolate w-full max-w-[540px] overflow-hidden rounded-3xl border border-purple-200 bg-white p-6 shadow-[0_18px_44px_rgba(76,29,149,0.16)] sm:p-8">
            <img
              src={logoWatermark}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[78%] w-auto -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
            />

            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-[#24143e]">Welcome back</h1>
              <p className="mt-1 text-sm text-[#6f43cf]">Sign in to your account to continue</p>

              <div className="mt-8 inline-flex rounded-full border border-[#d9cdf5] bg-[#f6f2ff] p-1 px-12">
                <button
                  type="button"
                  onClick={() => setSelectedRole("ADMIN")}
                  className={`rounded-full px-6 py-1.5 text-l font-semibold transition ${
                    selectedRole === "ADMIN" ? "bg-[#6f43cf] text-white" : "text-[#6f43cf]"
                  }`}
                >
                  Admin Login
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("STAFF")}
                  className={`rounded-full px-6 py-1.5 text-l font-semibold transition ${
                    selectedRole === "STAFF" ? "bg-[#6f43cf] text-white" : "text-[#6f43cf]"
                  }`}
                >
                  Staff Login
                </button>
              </div>

              

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#32234d]">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[#d9cdf5] bg-white px-4 text-sm text-[#2b1454] outline-none transition placeholder:text-[#9a8fc0] focus:border-[#8b67db] focus:ring-2 focus:ring-[#8b67db]/25"
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#32234d]">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-xl border border-[#d9cdf5] bg-white px-4 pr-11 text-sm text-[#2b1454] outline-none transition placeholder:text-[#9a8fc0] focus:border-[#8b67db] focus:ring-2 focus:ring-[#8b67db]/25"
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9d8fca] hover:text-[#6f43cf]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

                <button
                  type="submit"
                  disabled={isSigningIn}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#7f56d9_0%,#6f43cf_100%)] text-sm font-semibold text-white shadow-[0_10px_22px_rgba(111,67,207,0.34)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {isSigningIn ? "Signing in..." : "Sign In"}
                  <ArrowRight className={`h-4 w-4 transition ${isSigningIn ? "translate-x-1 animate-pulse" : ""}`} />
                </button>
              </form>

              <div className="mt-6 grid grid-cols-1 gap-2 border-t border-purple-100 pt-4 text-xs text-[#7a6da5] sm:grid-cols-3">
                <p className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />256-bit SSL</p>
                <p className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />GDPR Ready</p>
                <p className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />99.9% Uptime</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;


