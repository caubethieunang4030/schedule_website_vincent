import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 180_000, // 3 minutes
      gcTime: 300_000,    // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
