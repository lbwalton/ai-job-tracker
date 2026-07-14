import type { Metadata } from "next";
import { Syne, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "./nav";

const syne = Syne({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "JobTrackr",
  description: "AI-powered job application tracker",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "JobTrackr" },
};

export const viewport = {
  themeColor: "#16241E",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${inter.variable} ${geistMono.variable}`}>
        <Nav />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
