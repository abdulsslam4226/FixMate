import type { DefaultSession } from "next-auth";

type Role = "CUSTOMER" | "PROVIDER" | "ADMIN";

// `next-auth` re-exports these as `export type {...} from "@auth/core/..."`,
// which doesn't merge — augmentation has to target the modules where the
// interfaces are actually declared (Module 1.1 session typing).
declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      role: Role;
      phoneNumber: string;
    } & DefaultSession["user"];
    apiToken: string;
  }

  interface User {
    role: Role;
    phoneNumber: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    phoneNumber: string;
    apiToken: string;
  }
}
