import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "SMAP Web",
  description: "Smart Mobility Alicante Platform — web demo",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = {
  themeColor: "#005b73",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" translate="no" className="notranslate" suppressHydrationWarning>
    <head><meta name="google" content="notranslate" /></head>
    <body translate="no" className="notranslate"><a className="skip-link" href="#main-content">Saltar al contenido</a>{children}<ServiceWorkerRegister /></body>
  </html>;
}
