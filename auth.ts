import { prisma } from '@/db/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcrypt-ts-edge';
import NextAuth, { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextResponse } from 'next/server';

// ----- Types -----

type SafeUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

// ----- Route Protection -----
const PROTECTED_PATHS = [
  /\/shipping-address/,
  /\/payment-method/,
  /\/place-order/,
  /\/profile/,
  /\/user\/(.*)/,
  /\/order\/(.*)/,
  /\/admin/,
];

const isProtectedPath = (pathname: string) =>
  PROTECTED_PATHS.some((pattern) => pattern.test(pathname));

// ----- Session Cart Helpers -----

/**
 * Builds a NextResponse that sets (or rotates) the sessionCartId cookie.
 * Called both on first visit (no cookie yet) and after sign-out (stale cookie
 * must be replaced so the previous user's cart cannot leak into the new session).
 */
function responseWithFreshCartId(): NextResponse {
  const res = NextResponse.next();
  res.cookies.set('sessionCartId', crypto.randomUUID());
  return res;
}

export const config: NextAuthConfig = {
  debug: process.env.NODE_ENV !== 'production',
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: {
          type: 'email',
          label: 'Email',
        },
        password: {
          type: 'password',
          label: 'Password',
        },
      },
      /**
       * Validate credentials against the database.
       * Returns a SafeUser on success or null on failure.
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

        if (!user?.password) throw new Error('Invalid Credentials');

        // Check if user exists and if the password matches
        const isMatch = await compare(
          credentials.password as string,
          user.password,
        );

        if (!isMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        } as SafeUser;
      },
    }),
  ],
  callbacks: {
    /**
     * JWT callback — runs when a token is created or updated.
     * Populates token fields from the user object and handles display-name
     * fallback logic for users who signed up without a name.
     */
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.sub = user.id;
        token.role = user.role ?? null;
        token.name =
          user.name ?? (user.email ? user.email.split('@')[0] : null);

        // Persists an auto-generated display name back to the database
        if (user.name === 'NO_NAME') {
          token.name = user.email!.split('@')[0];

          // Update database to reflect the token name
          await prisma.user.update({
            where: { id: user.id },
            data: { name: token.name },
          });
        }

        // Propagate name updates triggered via session.update()
        if (session?.user?.name && trigger === 'update') {
          token.name = session.user.name;
        }
      }
      return token;
    },
    /**
     * Session callback — maps JWT token fields onto the session object
     * that is exposed to the client.
     */
    async session({ session, token }: any) {
      if (!token) throw new Error('No token provided');

      session.user = session.user ?? {};
      session.user.id = token.sub ?? session.user.id;
      session.user.role = token.role ?? session.user.role ?? null;
      session.user.name = token.name ?? session.user.name ?? null;

      return session;
    },
    /**
     * Authorized callback — runs on every request via middleware.
     *
     * Responsibilities:
     *  1. Block unauthenticated access to protected routes.
     *  2. Rotate the sessionCartId cookie when a user is not authenticated
     *     but an old cookie is still present (prevents cart leaking between
     *     users after sign-out).
     *  3. Issue a fresh sessionCartId on first visit (no cookie yet).
     */
    async authorized({ request, auth }): Promise<any> {
      // Get pathname from the req URL object
      const { pathname } = request.nextUrl;
      const hasCartCookie = !!request.cookies.get('sessionCartId');

      // 1. Block unauthenticated access to protected routes.
      if (!auth && isProtectedPath(pathname)) return false;

      // 2. [REMOVED] Stale cart cookie logic. It was infinitely resetting Guest Carts!
      // In the future, you should clear sessionCartId via your sign-out action, not here globally.

      // 3. Issue a cart cookie on first visit.
      if (!hasCartCookie) return responseWithFreshCartId();

      // Authenticated request with a valid cart cookie — nothing to do.
      return true;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
