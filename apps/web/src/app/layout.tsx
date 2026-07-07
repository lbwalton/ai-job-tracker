import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobTrackr",
  description: "AI-powered job application tracker",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/add", label: "Add Job" },
  { href: "/inbox", label: "Email Inbox" },
  { href: "/profile", label: "Autofill Profile" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            Job<span>Trackr</span>
          </Link>
          <nav>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
