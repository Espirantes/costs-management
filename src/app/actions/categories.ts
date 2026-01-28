"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireAuth() {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getCategories() {
  await requireAuth();
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      costItems: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function getCategoriesWithItems() {
  await requireAuth();
  return prisma.category.findMany({
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
    },
  });
}

export async function createCategory(name: string) {
  const session = await requireAdmin();

  const maxOrder = await prisma.category.aggregate({
    _max: { sortOrder: true },
  });

  const category = await prisma.category.create({
    data: {
      name,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "Category",
    entityId: category.id,
    newValue: { name },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function updateCategory(id: string, name: string) {
  const session = await requireAdmin();

  const oldCategory = await prisma.category.findUnique({
    where: { id },
    select: { name: true },
  });

  await prisma.category.update({
    where: { id },
    data: { name },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "Category",
    entityId: id,
    oldValue: oldCategory ?? undefined,
    newValue: { name },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function deleteCategory(id: string) {
  const session = await requireAdmin();

  const category = await prisma.category.findUnique({
    where: { id },
    select: { name: true },
  });

  await prisma.category.delete({
    where: { id },
  });

  await logAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "Category",
    entityId: id,
    oldValue: category ?? undefined,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function createCostItem(categoryId: string, name: string) {
  const session = await requireAuth();

  const maxOrder = await prisma.costItem.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });

  const costItem = await prisma.costItem.create({
    data: {
      name,
      categoryId,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "CostItem",
    entityId: costItem.id,
    newValue: { name, categoryId },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function updateCostItem(id: string, name: string) {
  const session = await requireAdmin();

  const oldItem = await prisma.costItem.findUnique({
    where: { id },
    select: { name: true },
  });

  await prisma.costItem.update({
    where: { id },
    data: { name },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "CostItem",
    entityId: id,
    oldValue: oldItem ?? undefined,
    newValue: { name },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function deleteCostItem(id: string) {
  const session = await requireAdmin();

  const costItem = await prisma.costItem.findUnique({
    where: { id },
    select: { name: true, categoryId: true },
  });

  await prisma.costItem.delete({
    where: { id },
  });

  await logAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "CostItem",
    entityId: id,
    oldValue: costItem ?? undefined,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}
