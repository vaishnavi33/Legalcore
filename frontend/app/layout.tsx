import type { Metadata, Viewport } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { UserProvider } from "@/components/UserProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Legal Core · Your legal work, simplified", template: "%s · Legal Core" },
  description:
    "Legal Core helps lawyers with case drafting and research, and helps people get legal advice from qualified advocates. Branches in Anantapur, Puttaparthi, Vijayawada, Visakhapatnam, Kurnool and Hyderabad.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f4d43" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+Telugu:wght@400;600&display=swap"
        />
      </head>
      <body>
        <UserProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </UserProvider>
      </body>
    </html>
  );
}
