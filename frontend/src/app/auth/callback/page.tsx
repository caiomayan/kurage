"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { refreshToken } from "@/lib/api";
import { REDIRECT_STORAGE_KEY } from "@/lib/constants";
import { PiSpinnerGap } from "react-icons/pi";

/**
 * Steam Auth Callback Page
 * The backend redirects the user here after successful Steam OpenID login.
 * The backend has already set the HttpOnly refresh_token cookie.
 * This page simply calls /auth/refresh to exchange the cookie for an access token,
 * then redirects the user to their original destination.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    document.title = "Kurage · Entrando com a Steam";
    if (hasRun.current) return;
    hasRun.current = true;

    async function handleCallback() {
      try {
        // The backend set an HttpOnly cookie. Call refresh to get the access token.
        const token = await refreshToken();

        if (!token) {
          // Refresh failed - likely no cookie was set (auth failed at backend level)
          router.replace("/?error=auth_failed");
          return;
        }

        // Get the original redirect destination saved before Steam login
        const storedRedirect = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
        sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
        const redirectTo = storedRedirect?.startsWith("/") && !storedRedirect.startsWith("//")
          ? storedRedirect
          : "/";

        router.replace(redirectTo);
      } catch {
        router.replace("/?error=auth_failed");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-4 text-center">
        <PiSpinnerGap className="h-8 w-8 animate-spin text-mute" />
        <p className="text-[14px] text-mute">Autenticando com a Steam...</p>
      </div>
    </div>
  );
}
