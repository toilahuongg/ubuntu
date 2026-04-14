import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { setSessionCookie } from "@/lib/auth/session";
import { requireEnv } from "@/lib/env";
import { authenticateGoogleUser } from "@/lib/services/auth-service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: requireEnv("AUTH_SECRET"),
  trustHost: true,
  providers: [
    Google({
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      authorization: {
        params: { prompt: "select_account" },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;

      const googleId = (profile?.sub as string | undefined) ?? account.providerAccountId;
      const email = (profile?.email as string | undefined)?.trim().toLowerCase();
      const fullName = (profile?.name as string | undefined)?.trim();
      const avatarUrl = (profile?.picture as string | undefined) ?? null;

      if (!googleId || !email) return false;

      try {
        const sessionUser = await authenticateGoogleUser({
          googleId,
          email,
          fullName: fullName || email,
          avatarUrl,
        });
        await setSessionCookie(sessionUser);
        return sessionUser.status === "PENDING" ? "/onboarding" : "/dashboard";
      } catch (error) {
        console.error("Google signIn failed:", error);
        return `/login?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Đăng nhập Google thất bại.",
        )}`;
      }
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  session: { strategy: "jwt" },
});
