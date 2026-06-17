import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginAttempts,
} from '@/services/rate-limit.service';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        userNo: { label: 'رقم المستخدم', type: 'text' },
        password: { label: 'كلمة المرور', type: 'password' },
      },
      async authorize(credentials) {
        const userNo = credentials?.userNo?.trim();
        const password = credentials?.password;

        if (!userNo || !password) {
          throw new Error('رقم المستخدم وكلمة المرور مطلوبان');
        }

        const rateKey = `login:${userNo}`;
        const rate = checkLoginRateLimit(rateKey);
        if (!rate.allowed) {
          const minutes = Math.ceil((rate.retryAfterMs || 0) / 60000);
          throw new Error(`تم تجاوز عدد محاولات الدخول. حاول بعد ${minutes} دقيقة`);
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ userNo }, { username: userNo }],
          },
          include: {
            roles: { include: { role: true } },
          },
        });

        if (!user || !user.isActive) {
          recordFailedLogin(rateKey);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          recordFailedLogin(rateKey);
          return null;
        }

        clearLoginAttempts(rateKey);

        return {
          id: user.id,
          email: user.email,
          name: user.nameAr,
          nameAr: user.nameAr,
          userNo: user.userNo ?? undefined,
          username: user.username,
          roles: user.roles.map((r) => r.role.name),
          themePreference: (user.themePreference as 'light' | 'dark' | 'system' | null) ?? 'system',
          primaryColor: user.primaryColor ?? '#2563eb',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.nameAr = (user as { nameAr?: string }).nameAr ?? user.name ?? undefined;
        token.userNo = (user as { userNo?: string }).userNo;
        token.username = (user as { username?: string }).username;
        token.roles = (user as { roles?: string[] }).roles;
        token.themePreference = (user as { themePreference?: string }).themePreference as
          | 'light'
          | 'dark'
          | 'system'
          | undefined;
        token.primaryColor = (user as { primaryColor?: string }).primaryColor;
      }
      if (trigger === 'update' && session) {
        const s = session as {
          themePreference?: 'light' | 'dark' | 'system';
          primaryColor?: string;
        };
        if (s.themePreference) token.themePreference = s.themePreference;
        if (s.primaryColor) token.primaryColor = s.primaryColor;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as typeof session.user & {
          themePreference?: 'light' | 'dark' | 'system';
          primaryColor?: string;
        };
        user.id = token.id as string;
        user.name = token.name as string;
        user.nameAr = token.nameAr as string;
        user.userNo = token.userNo as string;
        user.username = token.username as string;
        user.roles = token.roles as string[];
        user.themePreference = token.themePreference;
        user.primaryColor = token.primaryColor;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
