// Module 1.1 — "Authentication: Clerk or Auth.js (Session data injected with
// User Roles)". Self-hosted Auth.js (NextAuth v5) with a Credentials provider
// that defers to the Express API's /auth/login for verification, so the User
// table (and its bcrypt password hashes) stays owned by the backend.
//
// Cross-service bridge: on every sign-in the `jwt` callback mints a small
// HS256 JWT (sub = user id, role claim) signed with AUTH_SECRET — the SAME
// secret backend/.env carries. The Express API's attachSession middleware
// (backend/src/middleware/auth.ts) verifies that token to recover
// `{ id, role }`, which is how "session data" gets "injected with user roles"
// across the Next.js ⇄ Express boundary.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { SignJWT } from "jose";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function bridgeSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be set");
  return new TextEncoder().encode(secret);
}

interface BackendUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: "CUSTOMER" | "PROVIDER" | "ADMIN";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return null;

        const user = (await res.json()) as BackendUser;
        return { id: user.id, name: user.fullName, email: user.email, phoneNumber: user.phoneNumber, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as unknown as BackendUser).role;
        token.phoneNumber = (user as unknown as BackendUser).phoneNumber;
      }

      // Lets `update({ role: "PROVIDER" })` (called from useSession()) refresh
      // the role baked into the bridge JWT — used right after onboarding
      // promotes a CUSTOMER to PROVIDER on the backend.
      if (trigger === "update" && session?.role) {
        token.role = session.role as BackendUser["role"];
      }

      if (token.id && token.role) {
        token.apiToken = await new SignJWT({ role: token.role })
          .setProtectedHeader({ alg: "HS256" })
          .setSubject(token.id as string)
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(bridgeSecret());
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as BackendUser["role"];
        session.user.phoneNumber = token.phoneNumber as string;
      }
      session.apiToken = token.apiToken as string;
      return session;
    },
  },
});
