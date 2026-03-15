import type { DefaultSession } from 'next-auth';

// Extend NextAuth types with application-specific user fields.
//
// - `id` is the database primary key for the user (stored in token.sub).
// - `role` is used for authorization and should match the Prisma schema's `User.role` values.
//
// These fields are added on top of NextAuth's default session user shape.

declare module 'next-auth' {
  export interface Session {
    user: {
      id: string;
      /**
       * User role used for authorization checks.
       *
       * This is stored on the session/jwt payload and can be null for unauthenticated users.
       * Keep this in sync with `prisma/schema.prisma` `User.role` values.
       */
      role: string | null;
    } & DefaultSession['user'];
  }
}
