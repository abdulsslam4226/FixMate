import { prisma } from "../src/lib/prisma";

// Seeds the curated category grid described in Module 3.2-B
// (Plumbers, Electricians, AC Technicians, Carpenters).
const CATEGORIES = [
  { name: "Plumbing", iconName: "plumbing", description: "Leak repairs, pipe installation and drainage fixes from vetted local plumbers." },
  { name: "Electrical", iconName: "electrical", description: "Wiring, socket installs and electrical fault diagnosis from certified electricians." },
  { name: "AC & Cooling", iconName: "ac", description: "Air conditioning installation, servicing and repairs from trained AC technicians." },
  { name: "Carpentry", iconName: "carpentry", description: "Furniture repair, fittings and custom woodwork from skilled local carpenters." },
];

async function main() {
  for (const category of CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
