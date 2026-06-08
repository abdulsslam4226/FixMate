"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/discover", label: "Browse services" },
  { href: "/become-a-provider", label: "Become a provider" },
  { href: "/#about", label: "About" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

// TopAppBar shared across the marketing and discovery surfaces — carries the
// FixMate identity plus the Auth.js-backed session entry points (Module 1.1).
export function SiteHeader() {
  const { data: session } = useSession();

  return (
    <header className="bg-card/80 border-border sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="gradient-text font-mono text-sm font-semibold tracking-[0.2em] uppercase">
          FixMate
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground font-mono text-label-sm uppercase tracking-wide hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {session && (
            <Link
              href="/bookings"
              className="text-muted-foreground font-mono text-label-sm uppercase tracking-wide hover:text-foreground"
            >
              My bookings
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <span className="text-muted-foreground hidden font-mono text-label-sm sm:inline">
                Hi, {session.user.name?.split(" ")[0]}
              </span>
              <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button nativeButton={false} render={<Link href="/login">Log in</Link>} variant="ghost" size="sm" />
              <Button
                nativeButton={false}
                render={<Link href="/sign-up">Sign up</Link>}
                size="sm"
                className="gradient-violet border-0 text-primary-foreground"
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
