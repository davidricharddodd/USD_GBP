import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { AuthProvider } from "../helpers/useAuth";
import { ThemeModeProvider } from "../helpers/themeMode";
import { TooltipProvider } from "./Tooltip";
import { SonnerToaster } from "./SonnerToaster";
import { ScrollToHashElement } from "./ScrollToHashElement";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute “fresh” window
    },
  },
});

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#bg)" />
  <circle cx="256" cy="256" r="190" fill="none" stroke="rgba(34,197,94,0.15)" stroke-width="40" />
  <text x="150" y="320" font-family="sans-serif" font-weight="bold" font-size="180" fill="#22c55e" text-anchor="middle">$</text>
  <text x="362" y="305" font-family="sans-serif" font-weight="bold" font-size="140" fill="#60a5fa" text-anchor="middle">&#163;</text>
  <path d="M 220 196 L 292 196 M 272 176 L 292 196 L 272 216" stroke="#f59e0b" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 292 326 L 220 326 M 240 306 L 220 326 L 240 346" stroke="#f59e0b" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const faviconUrl = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;

export const GlobalContextProviders = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeModeProvider>
          <Helmet>
            <title>GBP/USD Rate Tracker</title>
            <link rel="icon" href={faviconUrl} />
          </Helmet>
          <ScrollToHashElement />
          <TooltipProvider>
            {children}
            <SonnerToaster />
          </TooltipProvider>
        </ThemeModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};