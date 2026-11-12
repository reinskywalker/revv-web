import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  checkUrlForAuthTokens,
  clearSavedSession,
  fetchMyProfile,
  getSavedSession,
  saveAuthSession,
  type AuthTokens,
  type RiderProfile,
} from "./api";

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
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<RiderProfile | null> => {
    const session = getSavedSession();
    if (!session.token) {
      setUser(null);
      return null;
    }

    try {
      const prof = await fetchMyProfile();
      setUser(prof);
      return prof;
    } catch (err: any) {
      if (err?.statusCode === 401) {
        clearSavedSession();
        setUser(null);
      }
      return null;
    }
  }, []);

  const login = useCallback(
    async (tokens: AuthTokens, username?: string) => {
      saveAuthSession(
        tokens.access_token,
        tokens.refresh_token,
        username,
      );
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
    },
    [],
  );

  const logout = useCallback(() => {
    clearSavedSession();
    setUser(null);
  }, []);

  useEffect(() => {
    // Check if redirect contains tokens in query params
    checkUrlForAuthTokens();

    const session = getSavedSession();
    if (session.token) {
      void refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user || !!getSavedSession().token,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
