"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryGrid } from "@/components/category-grid";
import type { ServiceCategory } from "@/lib/types";

export function SearchableCategories({ categories }: { categories: ServiceCategory[] }) {
  const [q, setQ] = useState("");

  const filtered = q.trim()
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.description?.toLowerCase().includes(q.toLowerCase()),
      )
    : categories;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-md">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search services (e.g. plumber, electrician…)"
          className="pl-9 pr-9"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Search className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">No categories match &ldquo;{q}&rdquo;.</p>
          <Button size="sm" variant="outline" onClick={() => setQ("")}>Clear search</Button>
        </div>
      ) : (
        <CategoryGrid categories={filtered} />
      )}
    </div>
  );
}
