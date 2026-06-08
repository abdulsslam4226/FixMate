import { prisma } from "./src/lib/prisma";
(async () => {
  const updated = await prisma.providerProfile.update({
    where: { id: "33b454a5-6e90-4130-9488-babc22760c3d" },
    data: { verificationStatus: "VERIFIED" },
  });
  console.log(updated);
  await prisma.$disconnect();
})();
