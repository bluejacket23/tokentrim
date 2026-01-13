import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Validate user credentials against backend
async function validateUser(email: string, password: string) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        id: data.id || data.email,
        email: data.email,
        name: data.name,
        image: data.image,
        subscriptionStatus: data.subscriptionStatus,
        trialEndsAt: data.trialEndsAt,
        trialDaysRemaining: data.trialDaysRemaining,
      };
    }
    return null;
  } catch (error) {
    console.error('Login validation error:', error);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        const user = await validateUser(credentials.email, credentials.password);
        return user;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // Sync user to our database
        try {
          const response = await fetch(`${API_URL}/auth/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
              provider: 'google',
              providerId: account.providerAccountId,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            // Attach subscription info to user
            (user as any).subscriptionStatus = data.subscriptionStatus;
            (user as any).trialEndsAt = data.trialEndsAt;
            (user as any).trialDaysRemaining = data.trialDaysRemaining;
          }
        } catch (error) {
          console.error('Failed to sync user:', error);
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.subscriptionStatus = (user as any).subscriptionStatus;
        token.trialEndsAt = (user as any).trialEndsAt;
        token.trialDaysRemaining = (user as any).trialDaysRemaining;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      
      // Refresh subscription status periodically (on session update)
      if (trigger === 'update' && token.email) {
        try {
          const response = await fetch(`${API_URL}/subscription/status?email=${token.email}`);
          if (response.ok) {
            const data = await response.json();
            token.subscriptionStatus = data.subscriptionStatus;
            token.trialDaysRemaining = data.trialDaysRemaining;
          }
        } catch (error) {
          console.error('Failed to refresh subscription status:', error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).subscriptionStatus = token.subscriptionStatus;
        (session.user as any).trialEndsAt = token.trialEndsAt;
        (session.user as any).trialDaysRemaining = token.trialDaysRemaining;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Type augmentation for session
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      subscriptionStatus?: string;
      trialEndsAt?: string;
      trialDaysRemaining?: number;
    };
  }
}

















