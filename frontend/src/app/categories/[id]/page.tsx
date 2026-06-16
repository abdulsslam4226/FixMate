import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProviderList } from "@/components/provider-list";
import { getCategories, getProvidersByCategory } from "@/lib/api";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const categories = await getCategories().catch(() => []);
  const cat = categories.find((c) => c.id === id);
  if (!cat) return { title: "Service providers" };
  return {
    title: `${cat.name} in Nigeria — Verified artisans`,
    description: `${cat.description} Browse and book verified ${cat.name.toLowerCase()} artisans near you on FixMate. Pay cash when the job is done.`,
    openGraph: {
      title: `${cat.name} | FixMate`,
      description: cat.description,
    },
  };
}

export default async function CategoryProvidersPage({ params }: Props) {
  const { id } = await params;
  const [categories, providers] = await Promise.all([getCategories(), getProvidersByCategory(id)]);
  const category = categories.find((c) => c.id === id);

  return (
    <main className="industrial-texture mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-12">
      <Link href="/discover" className="text-muted-foreground flex items-center gap-1 font-mono text-sm hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to categories
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-headline-md sm:text-headline-lg font-bold">{category?.name ?? "Service providers"}</h1>
        {category?.description && <p className="text-muted-foreground max-w-2xl">{category.description}</p>}
      </header>

      <ProviderList initialProviders={providers} categoryId={id} />
    </main>
  );
}
