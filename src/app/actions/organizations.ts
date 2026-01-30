"use server";

import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  requireOrganization,
  getUserOrganizations,
} from "@/lib/organization-context";
import { revalidatePath } from "next/cache";
import { OrgRole } from "@prisma/client";

export async function getOrganizations() {
  return await getUserOrganizations();
}

export async function getCurrentOrganization() {
  const { organizationId } = await requireOrganization();

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  return organization;
}

export async function createOrganization(name: string) {
  const session = await requireAuth();

  const organization = await prisma.organization.create({
    data: {
      name,
      createdById: session.user.id,
      organizationUsers: {
        create: {
          userId: session.user.id,
          role: OrgRole.OWNER,
        },
      },
    },
  });

  revalidatePath("/");

  return organization;
}

export async function inviteUserToOrganization(
  email: string,
  role: OrgRole = OrgRole.MEMBER
) {
  const { organizationId, orgRole } = await requireOrganization();

  // Only OWNER and ADMIN can invite users
  if (orgRole !== OrgRole.OWNER && orgRole !== OrgRole.ADMIN) {
    throw new Error("Insufficient permissions to invite users");
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("User not found with this email");
  }

  // Check if user is already in organization
  const existing = await prisma.organizationUser.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId,
      },
    },
  });

  if (existing) {
    throw new Error("User is already a member of this organization");
  }

  // Add user to organization
  const orgUser = await prisma.organizationUser.create({
    data: {
      userId: user.id,
      organizationId,
      role,
    },
  });

  revalidatePath("/admin/users");

  return orgUser;
}

export async function getOrganizationMembers() {
  const { organizationId } = await requireOrganization();

  const members = await prisma.organizationUser.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return members.map((m) => ({
    id: m.id,
    role: m.role,
    user: m.user,
  }));
}

export async function updateOrganizationUserRole(
  organizationUserId: string,
  newRole: OrgRole
) {
  const { organizationId, orgRole } = await requireOrganization();

  // Only OWNER can change roles
  if (orgRole !== OrgRole.OWNER) {
    throw new Error("Only organization owners can change user roles");
  }

  const orgUser = await prisma.organizationUser.findUnique({
    where: { id: organizationUserId },
  });

  if (!orgUser || orgUser.organizationId !== organizationId) {
    throw new Error("Organization member not found");
  }

  const updated = await prisma.organizationUser.update({
    where: { id: organizationUserId },
    data: { role: newRole },
  });

  revalidatePath("/admin/users");

  return updated;
}

export async function removeOrganizationUser(organizationUserId: string) {
  const { organizationId, orgRole } = await requireOrganization();

  // Only OWNER and ADMIN can remove users
  if (orgRole !== OrgRole.OWNER && orgRole !== OrgRole.ADMIN) {
    throw new Error("Insufficient permissions to remove users");
  }

  const orgUser = await prisma.organizationUser.findUnique({
    where: { id: organizationUserId },
  });

  if (!orgUser || orgUser.organizationId !== organizationId) {
    throw new Error("Organization member not found");
  }

  // Prevent removing the last OWNER
  if (orgUser.role === OrgRole.OWNER) {
    const ownerCount = await prisma.organizationUser.count({
      where: {
        organizationId,
        role: OrgRole.OWNER,
      },
    });

    if (ownerCount <= 1) {
      throw new Error("Cannot remove the last owner of the organization");
    }
  }

  await prisma.organizationUser.delete({
    where: { id: organizationUserId },
  });

  revalidatePath("/admin/users");
}
