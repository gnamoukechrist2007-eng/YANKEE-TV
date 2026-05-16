import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED_EMAILS = new Set(
  (process.env.TV_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "__Secure-authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: ".thorsteinson.com",
      },
    },
  },
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase() ?? "";
      if (!email) return false;
      if (ALLOWED_EMAILS.size > 0 && !ALLOWED_EMAILS.has(email)) return false;
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length === 0) {
        await db.insert(users).values({ email });
      }
      return true;
    },
    async jwt({ token, profile }) {
      const email = (profile?.email ?? token.email ?? "").toString().toLowerCase();
      if (email && !token.userId) {
        const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (rows[0]) token.userId = rows[0].id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
    authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const path = request.nextUrl.pathname;
      const publicPaths = ["/login", "/api/auth", "/api/sso/status"];
      if (publicPaths.some((p) => path.startsWith(p))) return true;
      return isLoggedIn;
    },
  },
  pages: { signIn: "/login" },
});

declare module "next-auth" {
  interface JWT {
    userId?: string;
  }
}
