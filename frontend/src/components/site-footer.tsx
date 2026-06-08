import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-border bg-card/40 border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <span className="gradient-text font-mono text-sm font-semibold tracking-[0.2em] uppercase">
          FixMate
        </span>
        <p className="text-muted-foreground text-label-sm font-mono">
          &copy; {new Date().getFullYear()} FixMate. Connecting Nigerian homes with verified local artisans.
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/#faq" className="text-muted-foreground hover:text-foreground text-label-sm font-mono uppercase tracking-wide">
            FAQ
          </Link>
          <Link href="/#contact" className="text-muted-foreground hover:text-foreground text-label-sm font-mono uppercase tracking-wide">
            Contact
          </Link>
          <Link href="/discover" className="text-muted-foreground hover:text-foreground text-label-sm font-mono uppercase tracking-wide">
            Browse services
          </Link>
          <Link href="/become-a-provider" className="text-muted-foreground hover:text-foreground text-label-sm font-mono uppercase tracking-wide">
            Become a provider
          </Link>
        </nav>
      </div>
    </footer>
  );
}
