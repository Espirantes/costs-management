"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

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
  const session = await requireAdmin();

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      role: data.role,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "User",
    entityId: user.id,
    newValue: { email: data.email, name: data.name, role: data.role },
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
  const session = await requireAdmin();

  const oldUser = await prisma.user.findUnique({
    where: { id },
    select: { name: true, role: true, isActive: true, email: true },
  });

  await prisma.user.update({
    where: { id },
    data,
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    oldValue: oldUser ?? undefined,
    newValue: { ...data, email: oldUser?.email },
  });

  revalidatePath("/admin/users");
}

export async function resetPassword(id: string, newPassword: string) {
  const session = await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  });

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    newValue: { passwordReset: true, email: user?.email },
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(id: string) {
  const session = await requireAdmin();

  if (session.user.id === id) {
    throw new Error("Cannot delete your own account");
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, name: true, role: true },
  });

  await prisma.user.delete({
    where: { id },
  });

  await logAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "User",
    entityId: id,
    oldValue: user ?? undefined,
  });

  revalidatePath("/admin/users");
}
