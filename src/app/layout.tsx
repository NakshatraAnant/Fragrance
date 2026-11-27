import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { ToastProvider } from "@/components/ui/toast";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { RevealObserver } from "@/components/reveal";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl()),
  title: { default: "Vasana House — India's own perfume house", template: "%s · Vasana House" },
  description: "Original Indian scents, made properly, easy to try. Discover Dhun, Vasana and Anvaya — with a Scent Finder, discovery sets credited on full size, and a Layering Studio.",
  applicationName: "Vasana House",
  openGraph: { type: "website", locale: "en_IN", siteName: "Vasana House" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#f6f1e9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={fontVariables} data-scroll-behavior="smooth">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">Skip to content</a>
        <ToastProvider>
          {children}
          <AnalyticsTracker />
          <RevealObserver />
        </ToastProvider>
      </body>
    </html>
  );
}
