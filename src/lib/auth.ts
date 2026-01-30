import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            organizationUsers: {
              take: 1,
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          currentOrganizationId: user.organizationUsers[0]?.organizationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.currentOrganizationId = user.currentOrganizationId;
      }
      // Support organization switching via session update
      if (trigger === "update" && session?.currentOrganizationId) {
        token.currentOrganizationId = session.currentOrganizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER";

        // If currentOrganizationId is missing (old session), fetch from DB
        let orgId = token.currentOrganizationId as string | null | undefined;
        if (!orgId && token.id) {
          const userWithOrg = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: {
              organizationUsers: {
                take: 1,
                orderBy: { createdAt: "asc" },
              },
            },
          });
          orgId = userWithOrg?.organizationUsers[0]?.organizationId;
        }

        session.user.currentOrganizationId = orgId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
});
