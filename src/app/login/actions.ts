"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  console.log("[LOGIN] Attempting login for:", email);

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/costs",
    });
  } catch (error) {
    // NextAuth throws redirect error on success - let it through
    if (isRedirectError(error)) {
      console.log("[LOGIN] Redirect triggered for:", email);
      throw error;
    }

    console.error("[LOGIN] Error:", error);

    if (error instanceof AuthError) {
      console.error("[LOGIN] AuthError type:", error.type);
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        default:
          return { error: `Auth error: ${error.type}` };
      }
    }

    return { error: `Unexpected error: ${String(error)}` };
  }
}
