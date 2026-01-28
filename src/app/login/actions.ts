"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

type LoginResult = {
  success?: boolean;
  error?: string;
  attemptsRemaining?: number;
  lockedUntil?: string;
};

export async function checkAccountStatus(email: string): Promise<{
  exists: boolean;
  isLocked: boolean;
  lockedUntil?: string;
  attemptsRemaining?: number;
}> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    return { exists: false, isLocked: false };
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    return {
      exists: true,
      isLocked: true,
      lockedUntil: user.lockedUntil.toISOString(),
    };
  }

  return {
    exists: true,
    isLocked: false,
    attemptsRemaining: MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts,
  };
}

export async function login(formData: FormData): Promise<LoginResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { error: "Invalid email or password" };
  }

  // Check if account is locked
  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    return {
      error: "Account is locked",
      lockedUntil: user.lockedUntil.toISOString(),
    };
  }

  // If lockout expired, reset attempts
  if (user.lockedUntil && user.lockedUntil <= now) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return { error: "Account is deactivated" };
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    // Increment failed attempts
    const newAttempts = user.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      },
    });

    await logAudit({
      userId: user.id,
      action: "LOGIN_FAILED",
      entity: "Session",
      newValue: { attempt: newAttempts, locked: shouldLock },
    });

    if (shouldLock) {
      return {
        error: "Account locked due to too many failed attempts",
        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString(),
      };
    }

    return {
      error: "Invalid email or password",
      attemptsRemaining: MAX_LOGIN_ATTEMPTS - newAttempts,
    };
  }

  // Successful login - reset failed attempts
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logAudit({
    userId: user.id,
    action: "LOGIN",
    entity: "Session",
  });

  // Proceed with NextAuth sign in
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      return { error: "Something went wrong" };
    }

    throw error;
  }
}
