"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

  await prisma.category.create({
    data: {
      name,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      createdById: session.user.id,
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function updateCategory(id: string, name: string) {
  await requireAdmin();

  await prisma.category.update({
    where: { id },
    data: { name },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function deleteCategory(id: string) {
  await requireAdmin();

  await prisma.category.delete({
    where: { id },
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

  await prisma.costItem.create({
    data: {
      name,
      categoryId,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      createdById: session.user.id,
    },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function updateCostItem(id: string, name: string) {
  await requireAdmin();

  await prisma.costItem.update({
    where: { id },
    data: { name },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}

export async function deleteCostItem(id: string) {
  await requireAdmin();

  await prisma.costItem.delete({
    where: { id },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/costs");
}
