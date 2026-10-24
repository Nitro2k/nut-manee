import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-thai";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoMoney",
  description: "Private, offline-first expense tracker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="antialiased">
      <body className="flex min-h-dvh flex-col">
        <AppProviders>{children}</AppProviders>
        {/* Shown via html[data-privacy-blur] when the app goes to the background. */}
        <div className="privacy-blur" aria-hidden />
      </body>
    </html>
  );
}
