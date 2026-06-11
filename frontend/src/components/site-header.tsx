"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";

const NAV_LINKS = [
  { href: "/discover", label: "Browse services" },
  { href: "/become-a-provider", label: "Become a provider" },
  { href: "/#about", label: "About" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

const NAV_CLS = "text-muted-foreground font-mono text-label-sm uppercase tracking-wide hover:text-foreground transition-colors";

export function SiteHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("#site-header")) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const roleLinks = session ? [
    ...(session.user.role === "PROVIDER" ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...(session.user.role === "ADMIN"    ? [{ href: "/admin",     label: "Admin" }]     : []),
    { href: "/bookings", label: "My bookings" },
  ] : [];

  const allLinks = [...NAV_LINKS, ...roleLinks];

  return (
    <header id="site-header" className="bg-card/80 border-border sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-2">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="FixMate — Your Trusted Repair Partner"
            width={200}
            height={64}
            className="h-16 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {allLinks.map((link) => (
            <Link key={link.href} href={link.href} className={NAV_CLS}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right — auth + hamburger */}
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <NotificationBell />
              <span className="text-muted-foreground hidden font-mono text-label-sm sm:inline">
                Hi, {session.user.name?.split(" ")[0]}
              </span>
              <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => signOut({ callbackUrl: "/" })}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button nativeButton={false} render={<Link href="/login">Log in</Link>} variant="ghost" size="sm" className="hidden md:inline-flex" />
              <Button
                nativeButton={false}
                render={<Link href="/sign-up">Sign up</Link>}
                size="sm"
                className="gradient-violet hidden border-0 text-primary-foreground md:inline-flex"
              />
            </>
          )}

          {/* Hamburger — mobile only */}
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
            className="text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-md transition-colors md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-border/60 bg-card/95 border-t backdrop-blur md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-6 py-4">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border-border/40 text-muted-foreground hover:text-foreground border-b py-3 font-mono text-sm uppercase tracking-wide last:border-0"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Auth actions inside mobile menu */}
            <div className="mt-4 flex flex-col gap-2">
              {session ? (
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}>
                  Log out
                </Button>
              ) : (
                <>
                  <Button nativeButton={false} render={<Link href="/login" onClick={() => setOpen(false)}>Log in</Link>} variant="outline" size="sm" className="w-full" />
                  <Button
                    nativeButton={false}
                    render={<Link href="/sign-up" onClick={() => setOpen(false)}>Sign up</Link>}
                    size="sm"
                    className="gradient-violet w-full border-0 text-primary-foreground"
                  />
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
