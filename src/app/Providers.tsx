"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";
import { Toaster } from "sonner";
import { Suspense } from "react";
import { Next13ProgressBar } from "next13-progressbar";
import { SWRConfig } from "swr";
import { fetcher } from "@/shared/lib/swr/fetcher";
import { ThemeProvider } from "next-themes";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      <Suspense>
        <SessionProvider>
          <SWRConfig
            value={{
              fetcher,
              dedupingInterval: 5000, // 5s - evita chamadas duplicadas sem mascarar mutacoes
              revalidateOnFocus: false, // desabilitado para evitar refetches desnecessarios ao trocar de aba
              revalidateIfStale: true, // revalidar dados stale em background
              revalidateOnMount: true, // revalidar no primeiro mount
              keepPreviousData: true, // mantem dados anteriores durante revalidacao (evita flash de loading)
              errorRetryCount: 3,
              shouldRetryOnError: true,
            }}
          >
            <Next13ProgressBar
              height="4px"
              color="hsl(var(--primary))"
              options={{ showSpinner: true }}
              showOnShallow
            />

            {children}
            <Toaster position="top-center" richColors theme="system" />
          </SWRConfig>
        </SessionProvider>
      </Suspense>
    </ThemeProvider>
  );
}

export default Providers;
