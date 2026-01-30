"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import {
  requireOrganization,
  verifyShopAccess,
} from "@/lib/organization-context";

function validateMonthYear(month: number, year: number) {
  if (month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12");
  }
  if (year < 2000 || year > 2100) {
    throw new Error("Year must be between 2000 and 2100");
  }
}

export async function getCostEntries(
  year: number,
  month: number,
  shopId: string
) {
  const { organizationId } = await requireOrganization();

  // If shopId is "ORGANIZATION", fetch org-level entries (shopId=null)
  const isOrgView = shopId === "ORGANIZATION";
  if (!isOrgView) {
    await verifyShopAccess(shopId);
  }

  validateMonthYear(month, year);

  const entries = await prisma.costEntry.findMany({
    where: {
      year,
      month,
      shopId: isOrgView ? null : shopId,
    },
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
  shopId: string,
  amount: number
) {
  const { userId, organizationId } = await requireOrganization();

  // If shopId is "ORGANIZATION", save as org-level entry (shopId=null)
  const isOrgView = shopId === "ORGANIZATION";
  if (!isOrgView) {
    await verifyShopAccess(shopId);
  }

  validateMonthYear(month, year);

  if (amount < 0) {
    throw new Error("Amount must be non-negative");
  }

  // Verify cost item exists and belongs to organization
  const costItem = await prisma.costItem.findUnique({
    where: { id: costItemId },
    include: {
      category: {
        select: {
          organizationId: true,
          shopId: true,
        },
      },
    },
  });

  if (!costItem || costItem.category.organizationId !== organizationId) {
    throw new Error("Cost item not found or doesn't belong to your organization");
  }

  // Verify cost item is available for this shop
  // (org-level categories OR shop-specific for this shop)
  if (costItem.category.shopId && costItem.category.shopId !== shopId) {
    throw new Error(
      "This cost item is not available for the selected shop"
    );
  }

  const actualShopId = isOrgView ? null : shopId;

  // Get existing entry for audit log
  const existingEntry = await prisma.costEntry.findUnique({
    where: {
      year_month_shopId_costItemId: {
        year,
        month,
        shopId: actualShopId,
        costItemId,
      },
    },
  });

  const entry = await prisma.costEntry.upsert({
    where: {
      year_month_shopId_costItemId: {
        year,
        month,
        shopId: actualShopId,
        costItemId,
      },
    },
    create: {
      year,
      month,
      shopId: actualShopId,
      costItemId,
      amount,
      createdById: userId,
    },
    update: {
      amount,
    },
  });

  await logAudit({
    userId,
    action: existingEntry ? "UPDATE" : "CREATE",
    entity: "CostEntry",
    entityId: entry.id,
    oldValue: existingEntry
      ? { amount: Number(existingEntry.amount), year, month, shopId: actualShopId }
      : undefined,
    newValue: { amount, year, month, shopId: actualShopId, costItemName: costItem.name },
    organizationId,
  });

  revalidatePath("/costs");
}

export async function bulkUpsertCostEntries(
  entries: Array<{
    costItemId: string;
    amount: number;
  }>,
  year: number,
  month: number,
  shopId: string
) {
  const { userId, organizationId } = await requireOrganization();

  const isOrgView = shopId === "ORGANIZATION";
  if (!isOrgView) {
    await verifyShopAccess(shopId);
  }

  validateMonthYear(month, year);
  const actualShopId = isOrgView ? null : shopId;

  // Validate all amounts
  for (const entry of entries) {
    if (entry.amount < 0) {
      throw new Error("All amounts must be non-negative");
    }
  }

  // Verify all cost items belong to organization
  const costItemIds = entries.map((e) => e.costItemId);
  const costItems = await prisma.costItem.findMany({
    where: {
      id: { in: costItemIds },
    },
    include: {
      category: {
        select: {
          organizationId: true,
          shopId: true,
        },
      },
    },
  });

  // Verify all items exist and belong to organization
  if (costItems.length !== costItemIds.length) {
    throw new Error("One or more cost items not found");
  }

  for (const item of costItems) {
    if (item.category.organizationId !== organizationId) {
      throw new Error("One or more cost items don't belong to your organization");
    }
    if (item.category.shopId && item.category.shopId !== shopId) {
      throw new Error(
        `Cost item "${item.name}" is not available for the selected shop`
      );
    }
  }

  // Use transaction for bulk update
  await prisma.$transaction(
    entries.map((entry) =>
      prisma.costEntry.upsert({
        where: {
          year_month_shopId_costItemId: {
            year,
            month,
            shopId: actualShopId,
            costItemId: entry.costItemId,
          },
        },
        create: {
          year,
          month,
          shopId: actualShopId,
          costItemId: entry.costItemId,
          amount: entry.amount,
          createdById: userId,
        },
        update: {
          amount: entry.amount,
        },
      })
    )
  );

  revalidatePath("/costs");
}
