"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { User } from "@/types/user";
import { api, getAccessToken, setAccessToken, refreshToken } from "@/lib/api";
import { REDIRECT_STORAGE_KEY, API_BASE_URL } from "@/lib/constants";

export { REDIRECT_STORAGE_KEY };

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithSteam: (returnTo?: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    let token = getAccessToken();

    // If no in-memory token exists, try bootstrap via HttpOnly cookie
    if (!token) {
      token = await refreshToken();
    }

    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const currentUser = await api.get<User>("/users/me");
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      setAccessToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        let token = getAccessToken();
        if (!token) {
          token = await refreshToken();
        }

        if (token) {
          const currentUser = await api.get<User>("/users/me");
          if (isMounted) {
            setUser(currentUser);
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const loginWithSteam = useCallback((returnTo?: string) => {
    if (typeof window !== "undefined") {
      const redirectTarget = returnTo || window.location.pathname + window.location.search;
      sessionStorage.setItem(REDIRECT_STORAGE_KEY, redirectTarget);
      
      const authUrl = `${API_BASE_URL}/auth/steam?returnUrl=${encodeURIComponent(redirectTarget)}`;
      // External Steam OpenID initiation via backend endpoint
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = authUrl;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout").catch(() => {});
    } finally {
      setAccessToken(null);
      setUser(null);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/";
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    return await fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginWithSteam,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
