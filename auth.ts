import NextAuth, { NextAuthConfig } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/db/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSync } from 'bcrypt-ts-edge';

export const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        // Find user in database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        // Check if user exists and if the password matches
        if (user && user.password) {
          const isMatch = compareSync(
            credentials.password as string,
            user.password
          );

          if (isMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          } else {
            return null;
          }
        } else {
          return null;
        }
      },
    }),
  ],
  pages: { signIn: '/sign-in', error: './sign-in' },
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session, user, trigger, token }: any) {
      // Set the user ID form the token
      session.user.id = token.sub;

      // If there is an update, set the user name
      if (trigger === 'update' && user) {
        session.user.name = user.name;
      }

      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
