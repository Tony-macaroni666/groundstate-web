"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV as nav } from "@/site.config";

/** True for the section's own page and anything beneath it, false for "/". */
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The logo files ship from brand/ground-state — never redrawn here. */
function Lockup({ file, className }: { file: string; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/${file}.svg`}
      alt="Ground State"
      width={220}
      height={19}
      className={className}
    />
  );
}

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b rule sticky top-0 z-40 bg-bone/95 dark:bg-ink/95 backdrop-blur">
      <div className="mx-auto max-w-content px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          <Link href="/" aria-label="Ground State — home" className="shrink-0 py-3">
            <Lockup file="lockup-horizontal-light" className="w-[190px] h-auto dark:hidden" />
            <Lockup file="lockup-horizontal-dark" className="w-[190px] h-auto hidden dark:block" />
          </Link>
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-8">
              {nav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`text-small transition-colors hover:text-forest dark:hover:text-sage ${
                        active ? "text-charcoal dark:text-bone" : "muted"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/contact"
              // Below lg the primary nav already carries Contact: showing the
              // CTA as well duplicated the link and overflowed the header by
              // 36 px at exactly 768 px, where the desktop nav appears.
              className="hidden lg:inline-flex text-small font-medium border border-charcoal dark:border-bone px-4 py-2 rounded hover:bg-charcoal hover:text-bone dark:hover:bg-bone dark:hover:text-ink transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
        <nav aria-label="Primary, compact" className="md:hidden border-t rule">
          <ul className="flex gap-6 overflow-x-auto py-3">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`text-small whitespace-nowrap ${
                      active ? "text-charcoal dark:text-bone" : "muted"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem("gs-theme", next ? "dark" : "light");
        } catch {}
      }}
      className="muted hover:text-charcoal dark:hover:text-bone transition-colors p-2"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" />
        <path d="M8 1a7 7 0 000 14z" fill="currentColor" />
      </svg>
    </button>
  );
}

export function Footer() {
  return (
    <footer className="border-t rule mt-24">
      <div className="mx-auto max-w-content px-4 md:px-6 lg:px-8 py-16">
        <div className="grid gap-12 md:grid-cols-[1fr_auto]">
          <div>
            <Lockup file="lockup-tagline-light" className="w-[300px] max-w-full h-auto dark:hidden" />
            <Lockup file="lockup-tagline-dark" className="w-[300px] max-w-full h-auto hidden dark:block" />
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-3 md:text-right">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="text-small muted hover:text-charcoal dark:hover:text-bone">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="text-caption muted mt-16 max-w-prose">
          General information, not individual medical advice. Consult a qualified
          clinician about your own condition.
        </p>
        <p className="text-caption muted mt-4">
          © {new Date().getFullYear()} Ground State
        </p>
      </div>
    </footer>
  );
}
