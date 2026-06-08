import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoryIcon } from "@/lib/category-icons";
import { ServiceCategory } from "@/lib/types";

// Categorical Discovery Layout — Module 3.2-B: a curated grid of vital
// consumer services. No open text search in Phase 1; users tap a tile.
export function CategoryGrid({ categories }: { categories: ServiceCategory[] }) {
  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No service categories are available yet. Check back soon.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.iconName);
        return (
          <Link key={category.id} href={`/categories/${category.id}`}>
            <Card className="group h-full border-border/60 transition-colors hover:border-primary/60 hover:bg-accent/40">
              <CardHeader className="flex flex-col items-start gap-3">
                <span className="gradient-violet rounded-md p-3 text-primary-foreground shadow-lg shadow-primary/20">
                  <Icon className="h-6 w-6" />
                </span>
                <CardTitle className="font-heading text-base">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-2 text-sm">{category.description}</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
