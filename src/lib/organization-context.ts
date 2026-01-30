import { auth } from "./auth";
import { prisma } from "./prisma";
import { OrgRole } from "@prisma/client";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class OrganizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationError";
  }
}

/**
 * Verify user is authenticated
 * @throws {AuthError} If user is not authenticated
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("Authentication required");
  }
  return session;
}

/**
 * Verify user has organization context
 * @throws {AuthError} If user is not authenticated
 * @throws {OrganizationError} If user has no organization context
 */
export async function requireOrganization() {
  const session = await requireAuth();

  if (!session.user.currentOrganizationId) {
    throw new OrganizationError(
      "Organization context required. Please select an organization."
    );
  }

  return {
    userId: session.user.id,
    organizationId: session.user.currentOrganizationId,
    userRole: session.user.role,
  };
}

/**
 * Verify user has ADMIN or OWNER role in current organization
 * @throws {AuthError} If user is not authenticated
 * @throws {OrganizationError} If user has no organization or insufficient permissions
 */
export async function requireOrgAdmin() {
  const { userId, organizationId } = await requireOrganization();

  const orgUser = await prisma.organizationUser.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!orgUser || (orgUser.role !== OrgRole.ADMIN && orgUser.role !== OrgRole.OWNER)) {
    throw new OrganizationError(
      "Insufficient permissions. Admin or Owner role required."
    );
  }

  return {
    userId,
    organizationId,
    orgRole: orgUser.role,
  };
}

/**
 * Verify shop belongs to current organization
 * @param shopId - Shop ID to verify
 * @throws {AuthError} If user is not authenticated
 * @throws {OrganizationError} If shop doesn't belong to organization
 */
export async function verifyShopAccess(shopId: string) {
  const { organizationId } = await requireOrganization();

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
  });

  if (!shop || shop.organizationId !== organizationId) {
    throw new OrganizationError(
      "Shop not found or doesn't belong to your organization"
    );
  }

  return shop;
}

/**
 * Get user's organizations
 * @throws {AuthError} If user is not authenticated
 */
export async function getUserOrganizations() {
  const session = await requireAuth();

  const orgUsers = await prisma.organizationUser.findMany({
    where: { userId: session.user.id },
    include: {
      organization: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return orgUsers.map((ou) => ({
    id: ou.organization.id,
    name: ou.organization.name,
    role: ou.role,
  }));
}
