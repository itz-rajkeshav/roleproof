"use client";

import { Toaster } from "@roleproof/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";

import { getQueryClient } from "@/utils/orpc";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
