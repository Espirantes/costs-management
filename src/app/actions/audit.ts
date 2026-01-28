"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getAuditLogs(options?: {
  limit?: number;
  offset?: number;
  entity?: string;
  action?: string;
  userId?: string;
}) {
  await requireAdmin();

  const { limit = 50, offset = 0, entity, action, userId } = options ?? {};

  const where = {
    ...(entity && { entity }),
    ...(action && { action }),
    ...(userId && { userId }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    hasMore: offset + logs.length < total,
  };
}

export async function getAuditStats() {
  await requireAdmin();

  const [totalLogs, recentLogins, recentFailedLogins] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({
      where: {
        action: "LOGIN",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: "LOGIN_FAILED",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    totalLogs,
    recentLogins,
    recentFailedLogins,
  };
}
