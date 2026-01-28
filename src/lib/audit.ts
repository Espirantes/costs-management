"use server";

import { prisma } from "./prisma";

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGIN_FAILED" | "LOGOUT";
type AuditEntity = "User" | "Category" | "CostItem" | "CostEntry" | "Session";

export async function logAudit({
  userId,
  action,
  entity,
  entityId,
  oldValue,
  newValue,
}: {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldValue: oldValue ?? undefined,
        newValue: newValue ?? undefined,
      },
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error("Audit log error:", error);
  }
}
