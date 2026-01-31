import { prisma } from '@/db/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcrypt-ts-edge';
import NextAuth, { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type SafeUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

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
      // authorize should return a user object (without sensitive fields) or null on failure.

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Find user in database
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

        // Optionally, this is also the place you could do a user registration
        if (!user || !user.password) throw new Error('Invalid Credentials');

        // Check if user exists and if the password matches

        const isMatch = await compare(
          credentials.password as string,
          user.password
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
    // Populate token fields from the user fields
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.sub = user.id;
        token.role = user.role ?? null;
        token.name =
          user.name ?? (user.email ? user.email.split('@')[0] : null);

        // If user has no name, then use the email
        if (user.name === 'NO_NAME') {
          token.name = user.email!.split('@')[0];

          // Update database to reflect the token name
          await prisma.user.update({
            where: { id: user.id },
            data: { name: token.name },
          });
        }

        // Propagate name updates triggered via session update
        if (session?.user?.name && trigger === 'update') {
          token.name = session.user.name;
        }

        // Move this from here
        if (trigger === 'signIn' || trigger === 'signUp') {
          const cookiesObj = await cookies();
          const sessionCartId = cookiesObj.get('sessionCartId')?.value;

          if (sessionCartId) {
            const sessionCart = await prisma.cart.findUnique({
              where: { sessionCartId },
            });

            if (sessionCart) {
              // Delete current user cart
              await prisma.cart.deleteMany({ where: { userId: user.id } });

              // Assign new cart
              await prisma.cart.update({
                where: { id: sessionCart.id },
                data: { userId: user.id },
              });
            }
          }
        }
      }
      return token;
    },
    // map token --> session safely
    async session({ session, token }: any) {
      session.user = session.user ?? {};
      // The token should be available now, if populated by jwt callback
      if (!token) throw new Error('No token provided');
      // token.sub is expected to hold user id
      session.user.id = token.sub ?? session.user.id;
      session.user.role = token.role ?? session.user.role ?? null;
      session.user.name = token.name ?? session.user.name ?? null;
      return session;
    },
    async authorized({ request, auth }): Promise<any> {
      // Array of regex patterns of path we want to protect
      const protectedPaths = [
        /\/shipping-address/,
        /\/payment-method/,
        /\/place-order/,
        /\/profile/,
        /\/user\/(.*)/,
        /\/order\/(.*)/,
        /\/admin/,
      ];

      // Get pathname from the req URL object
      const { pathname } = request.nextUrl;

      // Check if user is not authenticated and accessing a protected route
      if (!auth && protectedPaths.some((path) => path.test(pathname)))
        return false;

      // If the request already has sessionCartId, continue.
      if (request.cookies.get('sessionCartId')) return true;

      // Otherwise, Generate new sessionCartId and set it in the response cookie for subsequent requests.
      const sessionCartId = crypto.randomUUID();

      // Clone headers so downstream middleware/handlers receive the same headers
      const newReqHeaders = new Headers(request.headers);

      // Add new headers
      const res = NextResponse.next({
        request: {
          headers: newReqHeaders,
        },
      });

      // Set cookie, with new sessionCartId
      res.cookies.set('sessionCartId', sessionCartId);

      return res;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
