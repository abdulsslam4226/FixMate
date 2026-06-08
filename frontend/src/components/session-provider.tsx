"use client";

import { SessionProvider as AuthSessionProvider } from "next-auth/react";

// Bridges Auth.js's session into client components (Module 1.1) — anything
// below this in the tree can call `useSession()` from "next-auth/react".
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}
