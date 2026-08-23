import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const authPassword = process.env.AUTH_PASSWORD;

        if (!authPassword) {
          console.error('AUTH_PASSWORD not configured');
          return null;
        }

        if (credentials?.password === authPassword) {
          return {
            id: '1',
            name: 'Équipe Commerciale',
            email: 'sales@synapgen.fr',
          };
        }


        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
