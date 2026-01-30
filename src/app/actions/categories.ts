"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import {
  requireOrganization,
  requireOrgAdmin,
} from "@/lib/organization-context";

export async function getCategories(shopId?: string) {
  const { organizationId } = await requireOrganization();

  // If no shopId provided (admin view), return all categories
  // If shopId is "FIXED", get only FIXED scope categories
  // If shopId is a specific shop, get only VARIABLE scope categories
  const whereClause: any = { organizationId };

  if (shopId) {
    const isFixedView = shopId === "FIXED";
    whereClause.scope = isFixedView ? "FIXED" : "VARIABLE";
  }

  return prisma.category.findMany({
    where: whereClause,
    orderBy: [{ scope: "asc" }, { sortOrder: "asc" }],
    include: {
      costItems: {
        orderBy: { sortOrder: "asc" },
      },
      shop: true,
    },
  });
}

export async function getCategoriesWithItems(shopId?: string) {
  const { organizationId } = await requireOrganization();

  const isFixedView = shopId === "FIXED";

  return prisma.category.findMany({
    where: {
      organizationId,
      scope: isFixedView ? "FIXED" : "VARIABLE",
    },
    orderBy: { sortOrder: "asc" },
    include: {
      costItems: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
      },
      shop: {
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      },
    },
  });
}

export async function createCategory(
  name: string,
  scope: "FIXED" | "VARIABLE"
) {
  const { userId, organizationId } = await requireOrgAdmin();

  const maxOrder = await prisma.category.aggregate({
    where: { organizationId, scope },
    _max: { sortOrder: true },
  });

  const category = await prisma.category.create({
    data: {
      name,
      scope,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      organizationId,
      createdById: userId,
    },
  });

  await logAudit({
    userId,
    action: "CREATE",
    entity: "Category",
    entityId: category.id,
    newValue: { name, scope },
    organizationId,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function updateCategory(
  id: string,
  name: string,
  scope?: "FIXED" | "VARIABLE"
) {
  const { userId, organizationId } = await requireOrgAdmin();

  const oldCategory = await prisma.category.findUnique({
    where: { id },
    select: { name: true, scope: true, organizationId: true },
  });

  if (!oldCategory || oldCategory.organizationId !== organizationId) {
    throw new Error("Category not found or doesn't belong to your organization");
  }

  const updateData: any = { name };
  if (scope) {
    updateData.scope = scope;
  }

  await prisma.category.update({
    where: { id },
    data: updateData,
  });

  await logAudit({
    userId,
    action: "UPDATE",
    entity: "Category",
    entityId: id,
    oldValue: { name: oldCategory.name, scope: oldCategory.scope },
    newValue: { name, scope: scope || oldCategory.scope },
    organizationId,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function deleteCategory(id: string) {
  const { userId, organizationId } = await requireOrgAdmin();

  const category = await prisma.category.findUnique({
    where: { id },
    select: { name: true, organizationId: true },
  });

  if (!category || category.organizationId !== organizationId) {
    throw new Error("Category not found or doesn't belong to your organization");
  }

  await prisma.category.delete({
    where: { id },
  });

  await logAudit({
    userId,
    action: "DELETE",
    entity: "Category",
    entityId: id,
    oldValue: { name: category.name },
    organizationId,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function createCostItem(categoryId: string, name: string) {
  const { userId, organizationId } = await requireOrganization();

  // Verify category belongs to organization
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category || category.organizationId !== organizationId) {
    throw new Error("Category not found or doesn't belong to your organization");
  }

  const maxOrder = await prisma.costItem.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });

  const costItem = await prisma.costItem.create({
    data: {
      name,
      categoryId,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      createdById: userId,
    },
  });

  await logAudit({
    userId,
    action: "CREATE",
    entity: "CostItem",
    entityId: costItem.id,
    newValue: { name, categoryId },
    organizationId,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function updateCostItem(id: string, name: string) {
  const { userId, organizationId } = await requireOrgAdmin();

  const oldItem = await prisma.costItem.findUnique({
    where: { id },
    select: {
      name: true,
      category: {
        select: { organizationId: true },
      },
    },
  });

  if (!oldItem || oldItem.category.organizationId !== organizationId) {
    throw new Error("Cost item not found or doesn't belong to your organization");
  }

  await prisma.costItem.update({
    where: { id },
    data: { name },
  });

  await logAudit({
    userId,
    action: "UPDATE",
    entity: "CostItem",
    entityId: id,
    oldValue: { name: oldItem.name },
    newValue: { name },
    organizationId,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function deleteCostItem(id: string) {
  const { userId, organizationId } = await requireOrgAdmin();

  const costItem = await prisma.costItem.findUnique({
    where: { id },
    select: {
      name: true,
      categoryId: true,
      category: {
        select: { organizationId: true },
      },
    },
  });

  if (!costItem || costItem.category.organizationId !== organizationId) {
    throw new Error("Cost item not found or doesn't belong to your organization");
  }

  await prisma.costItem.delete({
    where: { id },
  });

  await logAudit({
    userId,
    action: "DELETE",
    entity: "CostItem",
    entityId: id,
    oldValue: { name: costItem.name, categoryId: costItem.categoryId },
    organizationId,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}
