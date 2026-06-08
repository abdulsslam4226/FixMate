import { CategoryGrid } from "@/components/category-grid";
import { getCategories } from "@/lib/api";

// Categorical Discovery dashboard — Module 3.2-B.
export default async function DiscoverPage() {
  const categories = await getCategories();

  return (
    <main className="industrial-texture mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-headline-lg-mobile sm:text-headline-lg font-bold">
          Find a trusted artisan near you
        </h1>
        <p className="text-muted-foreground max-w-2xl text-body-md">
          Pick a service category below to see verified local plumbers, electricians, AC technicians
          and carpenters in your area.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-headline-md font-semibold">Browse by category</h2>
        <CategoryGrid categories={categories} />
      </section>
    </main>
  );
}
