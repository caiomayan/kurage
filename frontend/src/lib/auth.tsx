"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { UserWithStats } from "@/types/user";
import {
  ApiError,
  api,
  getAccessToken,
  setAccessToken,
  refreshToken,
} from "@/lib/api";
import { REDIRECT_STORAGE_KEY, API_BASE_URL } from "@/lib/constants";

export { REDIRECT_STORAGE_KEY };

interface AuthContextType {
  user: UserWithStats | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithSteam: (returnTo?: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserWithStats | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const root = document.documentElement;
    if (user?.subscriptionTier === "MARE") {
      root.dataset.kurageTheme = "mare";
    } else {
      delete root.dataset.kurageTheme;
    }

    return () => {
      delete root.dataset.kurageTheme;
    };
  }, [user?.subscriptionTier]);

  const fetchCurrentUser = useCallback(async (): Promise<UserWithStats | null> => {
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
      const currentUser = await api.get<UserWithStats>("/users/me");
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      // Do not discard a valid in-memory session for a temporary API failure.
      // Only an explicit unauthenticated response means the session is gone.
      if (isUnauthenticated(error)) {
        setUser(null);
        setAccessToken(null);
      }
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
          const currentUser = await api.get<UserWithStats>("/users/me");
          if (isMounted) {
            setUser(currentUser);
          }
        }
      } catch (error) {
        if (isMounted && isUnauthenticated(error)) {
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
