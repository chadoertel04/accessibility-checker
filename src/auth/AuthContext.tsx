import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { KeycloakProfile, KeycloakTokenParsed } from "keycloak-js";
import { initializeKeycloak, keycloak } from "@/auth/keycloak";

interface AuthContextValue {
  initialized: boolean;
  isAuthenticated: boolean;
  username: string | null;
  roles: string[];
  token: string | undefined;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getValidToken: () => Promise<string | undefined>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getRoles(tokenParsed: KeycloakTokenParsed | undefined): string[] {
  const realmRoles = tokenParsed?.realm_access?.roles;
  return Array.isArray(realmRoles) ? realmRoles : [];
}

function getPreferredUsername(profile: KeycloakProfile | null): string | null {
  return profile?.username ?? profile?.firstName ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refreshAuthState = useCallback(async () => {
    setIsAuthenticated(Boolean(keycloak.authenticated));
    setRoles(getRoles(keycloak.tokenParsed));

    if (keycloak.authenticated) {
      try {
        const profile = await keycloak.loadUserProfile();
        setUsername(getPreferredUsername(profile));
      } catch {
        setUsername((keycloak.tokenParsed?.preferred_username as string) ?? null);
      }
      return;
    }

    setUsername(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    keycloak.onAuthSuccess = () => {
      void refreshAuthState();
    };

    keycloak.onAuthLogout = () => {
      setIsAuthenticated(false);
      setUsername(null);
      setRoles([]);
    };

    keycloak.onTokenExpired = () => {
      void keycloak.updateToken(30).catch(() => {
        setError("Session expired. Please sign in again.");
        void keycloak.login();
      });
    };

    void initializeKeycloak({
        onLoad: "check-sso",
        pkceMethod: "S256",
        checkLoginIframe: false,
      })
      .then(async () => {
        if (cancelled) return;
        await refreshAuthState();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Unable to initialize authentication.";
        setError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setInitialized(true);
        }
      });

    const refreshInterval = window.setInterval(() => {
      if (!keycloak.authenticated) return;
      void keycloak.updateToken(30).catch(() => {
        setError("Unable to refresh session. Please sign in again.");
      });
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      keycloak.onAuthSuccess = undefined;
      keycloak.onAuthLogout = undefined;
      keycloak.onTokenExpired = undefined;
    };
  }, [refreshAuthState]);

  const login = useCallback(async () => {
    await keycloak.login();
  }, []);

  const logout = useCallback(async () => {
    await keycloak.logout({
      redirectUri: window.location.origin + import.meta.env.BASE_URL,
    });
  }, []);

  const getValidToken = useCallback(async () => {
    if (!keycloak.authenticated) {
      return undefined;
    }

    await keycloak.updateToken(30);
    return keycloak.token;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      initialized,
      isAuthenticated,
      username,
      roles,
      token: keycloak.token,
      error,
      login,
      logout,
      getValidToken,
    }),
    [initialized, isAuthenticated, username, roles, error, login, logout, getValidToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
