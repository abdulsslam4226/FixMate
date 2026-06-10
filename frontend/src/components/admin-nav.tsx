"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, BarChart3, ShieldCheck } from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Overview", icon: BarChart3, exact: true },
  { href: "/admin/verification-queue", label: "Verification queue", icon: ShieldCheck },
  { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-border/60 mb-8 flex flex-wrap gap-1 border-b pb-1">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
