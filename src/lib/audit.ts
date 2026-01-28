"use server";

import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

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
        oldValue: oldValue ? (oldValue as Prisma.InputJsonValue) : Prisma.JsonNull,
        newValue: newValue ? (newValue as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error("Audit log error:", error);
  }
}
