import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const seedData = [
  {
    name: "Cost of Transportation",
    items: [
      "Zásilkovna/Packetta",
      "GLS",
      "PPL",
      "Ceska Posta",
      "Costs of Transportation (Tsucho, Sabo, Raben)",
    ],
  },
  {
    name: "Cost of Marketing",
    items: [
      "Sklik",
      "Zboží.cz",
      "Heureka CZ",
      "Google",
      "Bing",
      "Facebook",
      "Mergado",
      "PPC Bee",
      "Conviu",
      "Lead Hub (direct emails)",
      "Firmy.cz",
      "Správa Online Reklamy (Vašek+Kuba)",
      "Domains",
      "Graphics, Banners, Promotions",
      "Spare Line 1",
      "Spare Line 2",
    ],
  },
  {
    name: "Provozní Náklady",
    items: [
      "Nájem, Voda, Plyn, Odpady",
      "Použité kartony Tavobal",
      "Použité kartony Krištof",
      "Štítky do tiskárny",
      "Obalové Materiály (pásky, bubliny, papír, Folie)",
      "Balikobot",
      "Čisté mzdy",
      "Sociální a zdravotní poj.",
      "Brigády",
      "Pojistky auta",
      "Palivo Osobní Auta, Citroen, Skoda",
      "HR",
      "IT, opravy",
      "Účtárna",
      "Finance",
      "Pickovací systém Brani.cz",
      "Akvizice, BG, ES",
      "Spare Line 1",
      "Spare Line 2",
    ],
  },
];

async function main() {
  console.log("Starting seed...");

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let adminUser;
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Administrator",
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log(`Created admin user: ${adminEmail}`);
  } else {
    adminUser = existingAdmin;
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  // Create default organization
  let organization = await prisma.organization.findFirst();
  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: "Online Empire",
        createdById: adminUser.id,
        organizationUsers: {
          create: {
            userId: adminUser.id,
            role: "OWNER",
          },
        },
      },
    });
    console.log(`Created organization: ${organization.name}`);
  } else {
    console.log(`Organization already exists: ${organization.name}`);
  }

  // Create categories and items
  for (let i = 0; i < seedData.length; i++) {
    const categoryData = seedData[i];

    const existingCategory = await prisma.category.findFirst({
      where: {
        name: categoryData.name,
        organizationId: organization.id,
      },
    });

    if (existingCategory) {
      console.log(`Category already exists: ${categoryData.name}`);
      continue;
    }

    const category = await prisma.category.create({
      data: {
        name: categoryData.name,
        sortOrder: i + 1,
        scope: "VARIABLE",
        organizationId: organization.id,
        createdById: adminUser.id,
      },
    });

    console.log(`Created category: ${category.name}`);

    for (let j = 0; j < categoryData.items.length; j++) {
      const itemName = categoryData.items[j];
      await prisma.costItem.create({
        data: {
          name: itemName,
          categoryId: category.id,
          sortOrder: j + 1,
          createdById: adminUser.id,
        },
      });
    }

    console.log(`  Created ${categoryData.items.length} items`);
  }

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
