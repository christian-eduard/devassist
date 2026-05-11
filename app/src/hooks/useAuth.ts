"use client";
// src/hooks/useAuth.ts — Auth hook for protected pages
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, getUser, type User } from "@/lib/auth-client";

export function useAuth(requiredRole?: "super_admin") {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      // Quick check from localStorage
      const cached = getUser();
      if (!cached) {
        router.replace("/login");
        return;
      }

      // Verify with server
      const sessionUser = await getSession();
      if (!sessionUser) {
        router.replace("/login");
        return;
      }

      // Check role
      if (requiredRole && sessionUser.role !== requiredRole) {
        router.replace("/dashboard");
        return;
      }

      setUser(sessionUser);
      setLoading(false);
    }

    checkAuth();
  }, [router, requiredRole]);

  return { user, loading };
}
