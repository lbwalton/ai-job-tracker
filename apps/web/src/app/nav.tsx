"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/add", label: "Add", icon: null }, // raised center button
  { href: "/profile", label: "Profile", icon: ProfileIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const TOP_NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/add", label: "Add Job" },
  { href: "/inbox", label: "Email Inbox" },
  { href: "/profile", label: "Autofill Profile" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    async function count() {
      try {
        const res = await fetch("/api/emails");
        const { emails } = (await res.json()) as {
          emails: Array<{ suggestedStatus: string | null; statusApplied: number }>;
        };
        if (alive)
          setPending(emails.filter((e) => e.suggestedStatus && !e.statusApplied).length);
      } catch {
        /* nav badge is best-effort */
      }
    }
    count();
    const t = setInterval(count, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pathname]);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          Job<span>Trackr</span>
        </Link>
        <nav>
          {TOP_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={active(item.href) ? "on" : ""}>
              {item.label}
              {item.href === "/inbox" && pending > 0 && <span className="nav-bdg">{pending}</span>}
            </Link>
          ))}
        </nav>
      </header>

      <nav className="tabbar" aria-label="Primary">
        <div className="tabs-inner">
          {TABS.map((tab) =>
            tab.icon ? (
              <Link
                key={tab.href}
                href={tab.href}
                className={`tab ${active(tab.href) ? "on" : ""}`}
                aria-current={active(tab.href) ? "page" : undefined}
              >
                <tab.icon />
                <span>{tab.label}</span>
                {tab.href === "/inbox" && pending > 0 && (
                  <span className="bdg" aria-label={`${pending} emails need review`}>
                    {pending}
                  </span>
                )}
              </Link>
            ) : (
              <Link key={tab.href} href={tab.href} className="tab add" aria-label="Add job">
                <span className="plus" aria-hidden>
                  +
                </span>
              </Link>
            ),
          )}
        </div>
      </nav>
    </>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9h13v-9" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c1.6-3.2 4-4.5 7-4.5s5.4 1.3 7 4.5" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18" />
    </svg>
  );
}
