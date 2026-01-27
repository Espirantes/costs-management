"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

function validateMonthYear(month: number, year: number) {
  if (month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12");
  }
  if (year < 2000 || year > 2100) {
    throw new Error("Year must be between 2000 and 2100");
  }
}

export async function getCostEntries(year: number, month: number) {
  await requireAuth();
  validateMonthYear(month, year);

  const entries = await prisma.costEntry.findMany({
    where: { year, month },
    select: {
      id: true,
      costItemId: true,
      amount: true,
    },
  });

  // Convert Decimal to number for client
  return entries.map((entry) => ({
    ...entry,
    amount: Number(entry.amount),
  }));
}

export async function upsertCostEntry(
  costItemId: string,
  year: number,
  month: number,
  amount: number
) {
  const session = await requireAuth();
  validateMonthYear(month, year);

  if (amount < 0) {
    throw new Error("Amount must be non-negative");
  }

  // Verify cost item exists
  const costItem = await prisma.costItem.findUnique({
    where: { id: costItemId },
  });

  if (!costItem) {
    throw new Error("Cost item not found");
  }

  await prisma.costEntry.upsert({
    where: {
      year_month_costItemId: {
        year,
        month,
        costItemId,
      },
    },
    create: {
      year,
      month,
      costItemId,
      amount,
      createdById: session.user.id,
    },
    update: {
      amount,
    },
  });

  revalidatePath("/costs");
}

export async function bulkUpsertCostEntries(
  entries: Array<{
    costItemId: string;
    amount: number;
  }>,
  year: number,
  month: number
) {
  const session = await requireAuth();
  validateMonthYear(month, year);

  // Validate all amounts
  for (const entry of entries) {
    if (entry.amount < 0) {
      throw new Error("All amounts must be non-negative");
    }
  }

  // Use transaction for bulk update
  await prisma.$transaction(
    entries.map((entry) =>
      prisma.costEntry.upsert({
        where: {
          year_month_costItemId: {
            year,
            month,
            costItemId: entry.costItemId,
          },
        },
        create: {
          year,
          month,
          costItemId: entry.costItemId,
          amount: entry.amount,
          createdById: session.user.id,
        },
        update: {
          amount: entry.amount,
        },
      })
    )
  );

  revalidatePath("/costs");
}
