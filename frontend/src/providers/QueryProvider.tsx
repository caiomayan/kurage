"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // 30 seconds default stale time
            gcTime: 1000 * 60 * 5, // 5 minutes garbage collection for unmounted queries
            refetchOnWindowFocus: false, // Prevents excessive network roundtrips on window focus
            retry: 1, // Single retry on transient network errors
          },
          mutations: {
            retry: 0, // Never auto-retry mutations to prevent accidental duplicate actions
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
