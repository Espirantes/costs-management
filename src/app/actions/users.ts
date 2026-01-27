"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
  role: Role;
}) {
  await requireAdmin();

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      role: data.role,
    },
  });

  revalidatePath("/admin/users");
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    role?: Role;
    isActive?: boolean;
  }
) {
  await requireAdmin();

  await prisma.user.update({
    where: { id },
    data,
  });

  revalidatePath("/admin/users");
}

export async function resetPassword(id: string, newPassword: string) {
  await requireAdmin();

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(id: string) {
  const session = await requireAdmin();

  if (session.user.id === id) {
    throw new Error("Cannot delete your own account");
  }

  await prisma.user.delete({
    where: { id },
  });

  revalidatePath("/admin/users");
}
