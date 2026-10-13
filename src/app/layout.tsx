import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./clean.css";

export const metadata: Metadata = {
  title: "VYRA - High Performance for Everybody",
  description: "A local-first health intelligence prototype for activity, nutrition, recovery, cycle tracking, and AI-style insights.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "VYRA" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
