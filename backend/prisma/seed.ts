import { PrismaClient, KioskStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const mall = await prisma.mall.upsert({
    where: { id: "demo-mall-central" },
    update: {},
    create: {
      id: "demo-mall-central",
      name: "Central Mall",
      city: "Demo City",
      mapImageUrl: null,
      isActive: true
    }
  });

  const kiosks = [
    { id: "demo-kiosk-a101", code: "A-101", mapX: 24, mapY: 40, pricePerYear: 12000, status: KioskStatus.AVAILABLE },
    { id: "demo-kiosk-a102", code: "A-102", mapX: 62, mapY: 55, pricePerYear: 15000, status: KioskStatus.BOOKED },
    { id: "demo-kiosk-b201", code: "B-201", mapX: 44, mapY: 25, pricePerYear: 17500, status: KioskStatus.AVAILABLE }
  ];

  for (const kiosk of kiosks) {
    await prisma.kiosk.upsert({
      where: { id: kiosk.id },
      update: {
        mapX: kiosk.mapX,
        mapY: kiosk.mapY,
        pricePerYear: kiosk.pricePerYear,
        status: kiosk.status
      },
      create: {
        id: kiosk.id,
        mallId: mall.id,
        code: kiosk.code,
        mapX: kiosk.mapX,
        mapY: kiosk.mapY,
        pricePerYear: kiosk.pricePerYear,
        status: kiosk.status
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
