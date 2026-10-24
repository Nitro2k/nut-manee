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
      <body className="bg-muted/40">
        {/* Phone-width column, centered on larger screens. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background sm:border-x">
          <AppProviders>{children}</AppProviders>
        </div>
        {/* Shown via html[data-privacy-blur] when the app goes to the background. */}
        <div className="privacy-blur" aria-hidden />
      </body>
    </html>
  );
}
