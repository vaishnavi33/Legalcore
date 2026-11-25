import type { Metadata, Viewport } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { DemoBanner } from "@/components/Live";
import { UserProvider } from "@/components/UserProvider";
import "./globals.css";

export const metadata: Metadata = {
  // Link previews (WhatsApp, social media) need the full site address to find the logo image.
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: { default: "Legal Core Solutions · Your legal work, simplified", template: "%s · Legal Core Solutions" },
  description:
    "Legal Core Solutions is a legal support and coordination agency in India. Professional legal support, documentation and coordination for lawyers, individuals and businesses.",
  openGraph: { images: [{ url: "/brand/logo-full.jpg", width: 1536, height: 1024, alt: "Legal Core Solutions" }] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#13294b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+Telugu:wght@400;600&display=swap"
        />
      </head>
      <body>
        <UserProvider>
          <DemoBanner />
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </UserProvider>
      </body>
    </html>
  );
}
