import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  checkUrlForAuthTokens,
  clearSavedSession,
  fetchMyProfile,
  getSavedSession,
  logoutSession,
  saveAuthSession,
  type AuthTokens,
  type RiderProfile,
} from "./api";
import { invalidateCosmeticsCatalogCache } from "./cosmetics-cache";

interface AuthContextValue {
  user: RiderProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: AuthTokens, username?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<RiderProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RiderProfile | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<RiderProfile | null> => {
    const session = getSavedSession();
    if (!session.token) {
      setHasToken(false);
      setUser(null);
      return null;
    }

    setHasToken(true);
    try {
      const prof = await fetchMyProfile();
      setUser(prof);
      return prof;
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "statusCode" in err &&
        (err as { statusCode?: unknown }).statusCode === 401
      ) {
        clearSavedSession();
        setHasToken(false);
        setUser(null);
      }
      return null;
    }
  }, []);

  const login = useCallback(async (tokens: AuthTokens, username?: string) => {
    saveAuthSession(tokens.access_token, tokens.refresh_token, username);
    setHasToken(Boolean(tokens.access_token));
    try {
      const prof = await fetchMyProfile();
      setUser(prof);
    } catch {
      // Fallback: minimal profile from username
      if (username) {
        setUser({
          id: "",
          username,
          name: username,
          role: "member",
          is_phone_verified: false,
          is_email_verified: false,
        });
      }
    }
  }, []);

  const logout = useCallback(() => {
    void logoutSession();
    invalidateCosmeticsCatalogCache();
    setHasToken(false);
    setUser(null);
  }, []);

  useEffect(() => {
    // Check if redirect contains tokens in query params
    checkUrlForAuthTokens();

    const session = getSavedSession();
    setHasToken(Boolean(session.token));
    if (session.token) {
      void refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const isAuthenticated = !!user || hasToken;

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, isAuthenticated, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
