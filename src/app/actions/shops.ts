"use server";

import { prisma } from "@/lib/prisma";
import {
  requireOrganization,
  requireOrgAdmin,
  verifyShopAccess,
} from "@/lib/organization-context";
import { revalidatePath } from "next/cache";

export async function getShops() {
  const { organizationId } = await requireOrganization();

  const shops = await prisma.shop.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
  });

  return shops;
}

export async function getShop(shopId: string) {
  const shop = await verifyShopAccess(shopId);
  return shop;
}

export async function createShop(data: {
  name: string;
  displayName?: string;
}) {
  const { organizationId } = await requireOrgAdmin();

  // Get max sortOrder for auto-increment
  const maxShop = await prisma.shop.findFirst({
    where: { organizationId },
    orderBy: { sortOrder: "desc" },
  });

  const shop = await prisma.shop.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      organizationId,
      sortOrder: (maxShop?.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath("/admin/shops");
  revalidatePath("/costs");

  return shop;
}

export async function updateShop(
  shopId: string,
  data: {
    name?: string;
    displayName?: string | null;
    sortOrder?: number;
  }
) {
  await requireOrgAdmin();
  await verifyShopAccess(shopId);

  const shop = await prisma.shop.update({
    where: { id: shopId },
    data,
  });

  revalidatePath("/admin/shops");
  revalidatePath("/costs");

  return shop;
}

export async function deleteShop(shopId: string) {
  await requireOrgAdmin();
  await verifyShopAccess(shopId);

  // Check if shop has cost entries
  const entriesCount = await prisma.costEntry.count({
    where: { shopId },
  });

  if (entriesCount > 0) {
    throw new Error(
      `Cannot delete shop with ${entriesCount} cost entries. Please delete or reassign entries first.`
    );
  }

  // Check if shop has shop-specific categories
  const categoriesCount = await prisma.category.count({
    where: { shopId },
  });

  if (categoriesCount > 0) {
    throw new Error(
      `Cannot delete shop with ${categoriesCount} shop-specific categories. Please delete categories first.`
    );
  }

  await prisma.shop.delete({
    where: { id: shopId },
  });

  revalidatePath("/admin/shops");
  revalidatePath("/costs");
}

export async function reorderShops(shopIds: string[]) {
  await requireOrgAdmin();

  // Update sortOrder for all shops
  await Promise.all(
    shopIds.map((shopId, index) =>
      prisma.shop.update({
        where: { id: shopId },
        data: { sortOrder: index },
      })
    )
  );

  revalidatePath("/admin/shops");
  revalidatePath("/costs");
}
