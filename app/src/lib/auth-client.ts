// src/lib/auth-client.ts — Auth client for DevAssist SaaS
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.noahpro.studio/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "user";
  plan: "free" | "starter" | "pro" | "enterprise" | "super_premium";
  created_at?: string;
}

interface AuthResponse {
  ok: boolean;
  user: User;
  token: string;
  expiresAt: string;
  error?: string;
}

// Token management
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("da_token");
}

function setToken(token: string, expiresAt: string): void {
  localStorage.setItem("da_token", token);
  localStorage.setItem("da_token_expires", expiresAt);
}

function clearToken(): void {
  localStorage.removeItem("da_token");
  localStorage.removeItem("da_token_expires");
  localStorage.removeItem("da_user");
}

function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("da_user");
  return raw ? JSON.parse(raw) : null;
}

function setUser(user: User): void {
  localStorage.setItem("da_user", JSON.stringify(user));
}

// Auth functions
export async function signUp(data: { name: string; email: string; password: string }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: AuthResponse = await res.json();

  if (json.ok && json.token) {
    setToken(json.token, json.expiresAt);
    setUser(json.user);
  }

  return json;
}

export async function signIn(data: { email: string; password: string }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: AuthResponse = await res.json();

  if (json.ok && json.token) {
    setToken(json.token, json.expiresAt);
    setUser(json.user);
  }

  return json;
}

export async function signOut() {
  const token = getToken();
  if (token) {
    fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  clearToken();
  window.location.href = "/login";
}

export async function getSession(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.ok) {
      setUser(json.user);
      return json.user;
    }
    clearToken();
    return null;
  } catch {
    return null;
  }
}

export { getToken, getUser, clearToken };
export type { User };
