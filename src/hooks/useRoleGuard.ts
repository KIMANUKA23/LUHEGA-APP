// Role-based access control hook
// Guards admin-only screens and redirects unauthorized access
import { useEffect } from "react";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "../context/AuthContext";

export function useRoleGuard(requiredRole: "admin" | "staff" | null = null) {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      router.replace("/(auth)/login-choice");
      return;
    }

    if (requiredRole === "admin" && !isAdmin) {
      // Staff trying to access admin-only screen
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isAdmin, requiredRole, loading, router, pathname]);

  return {
    user,
    isAuthenticated,
    isAdmin,
    isStaff: !isAdmin && isAuthenticated,
  };
}

