import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "nut-manee",
  description: "Private, offline-first expense tracker",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
