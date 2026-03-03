
import { createContext, useContext, useState, useEffect } from "react";

interface User {
  email?: string;
  name?: string;
  username?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (value: unknown): User | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const role = String(raw.role ?? "").trim().toUpperCase();
  return {
    email: raw.email ? String(raw.email) : undefined,
    name: raw.name ? String(raw.name) : undefined,
    username: raw.username ? String(raw.username) : undefined,
    role: role || undefined,
  };
};

const loadStoredUser = (): User | null => {
  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    return normalizeUser(JSON.parse(storedUser));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(loadStoredUser());

    const onStorage = (event: StorageEvent) => {
      if (event.key === "user" || event.key === "access" || event.key === "refresh") {
        setUser(loadStoredUser());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const isAdminRole = (role: unknown) => {
  const normalized = String(role ?? "").trim().toUpperCase();
  return ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"].includes(normalized);
};
