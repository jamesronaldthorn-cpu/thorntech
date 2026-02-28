import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AuthUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));
  const [loading, setLoading] = useState(!!token);

  async function fetchUser(t: string) {
    try {
      const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem("auth_token");
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) fetchUser(token);
  }, []);

  async function login(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(email: string, password: string, name: string, phone?: string) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  }

  async function updateProfile(data: Partial<AuthUser>) {
    if (!token) return;
    const res = await fetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error);
    setUser(updated);
  }

  async function refreshUser() {
    if (token) await fetchUser(token);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
