import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

interface RequireRoleProps {
  allowed: (role?: string | null) => boolean;
  redirectTo?: string;
  loadingFallback?: ReactNode;
  children: ReactNode;
}

export function RequireRole({
  allowed,
  redirectTo = "/",
  loadingFallback = null,
  children,
}: RequireRoleProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const isAllowed = allowed(user?.role);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAllowed)) {
      void navigate({ to: redirectTo });
    }
  }, [isLoading, isAuthenticated, isAllowed, redirectTo, navigate]);

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!isAuthenticated || !isAllowed) {
    return null;
  }

  return <>{children}</>;
}
