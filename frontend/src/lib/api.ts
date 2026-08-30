/**
 * Kurage API Client
 * Centralized HTTP client with automatic Authorization header injection,
 * single-flight JWT token refresh deduplication, and resilient error recovery.
 */

import { API_BASE_URL } from "@/lib/constants";

let inMemoryToken: string | null = null;
let inflightRefreshPromise: Promise<string | null> | null = null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getRetryAfterMs(response: Response): number | null {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) return null;
  const seconds = Number(retryAfter);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1_000 : null;
}

export function setAccessToken(token: string | null) {
  inMemoryToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryToken;
}

/**
 * Deduplicated Refresh Token Request
 * Guarantees that multiple concurrent callers receive the same Promise,
 * preventing Refresh Token Rotation (RTR) race conditions.
 */
export async function refreshToken(): Promise<string | null> {
  if (inflightRefreshPromise) {
    return inflightRefreshPromise;
  }

  inflightRefreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include", // sends HttpOnly refresh_token and device_id cookies
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        setAccessToken(null);
        return null;
      }

      const data = await res.json();
      const newToken = data.accessToken || data.token || null;
      setAccessToken(newToken);
      return newToken;
    } catch (err) {
      console.error("Failed to refresh token:", err);
      setAccessToken(null);
      return null;
    } finally {
      inflightRefreshPromise = null;
    }
  })();

  return inflightRefreshPromise;
}

export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

function resolveApiUrl(endpoint: string): string {
  const apiBase = new URL(API_BASE_URL);
  if (/^https?:\/\//i.test(endpoint)) {
    const absolute = new URL(endpoint);
    if (absolute.origin !== apiBase.origin) {
      throw new Error("apiFetch only accepts URLs from the configured API origin");
    }
    return absolute.toString();
  }
  return `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { params, skipAuth = false, headers, ...restOptions } = options;

  let url = resolveApiUrl(endpoint);

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  }

  const isFormData = typeof FormData !== "undefined" && restOptions.body instanceof FormData;

  // Extract existing headers safely regardless of format
  const parsedHeaders: Record<string, string> = {};
  if (headers) {
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        parsedHeaders[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        parsedHeaders[key] = value;
      });
    } else {
      Object.assign(parsedHeaders, headers);
    }
  }

  const reqHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...parsedHeaders,
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      reqHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  let response = await fetch(url, {
    ...restOptions,
    headers: reqHeaders,
    credentials: "include",
  });

  // Only an authentication failure can renew the session. A 403 is a real
  // authorization denial and must never rotate a healthy refresh token.
  if (
    response.status === 401 &&
    !skipAuth &&
    !endpoint.includes("/auth/")
  ) {
    const newToken = await refreshToken();

    if (newToken) {
      reqHeaders["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...restOptions,
        headers: reqHeaders,
        credentials: "include",
      });
    }
  }

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
      else if (errorData.error) errorMessage = errorData.error;
    } catch {
      // not a json response
    }
    throw new ApiError(response.status, errorMessage, getRetryAfterMs(response));
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) => {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: isFormData ? (body as BodyInit) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) => {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return apiFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: isFormData ? (body as BodyInit) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) => {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return apiFetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: isFormData ? (body as BodyInit) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
};
