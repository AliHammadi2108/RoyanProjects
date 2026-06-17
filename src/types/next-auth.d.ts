import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      nameAr?: string;
      userNo?: string;
      username?: string;
      roles?: string[];
      themePreference?: 'light' | 'dark' | 'system';
      primaryColor?: string;
      phone?: string;
    } & DefaultSession['user'];
  }

  interface User {
    nameAr?: string;
    userNo?: string;
    username?: string;
    roles?: string[];
    themePreference?: 'light' | 'dark' | 'system';
    primaryColor?: string;
    phone?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    nameAr?: string;
    userNo?: string;
    username?: string;
    roles?: string[];
    themePreference?: 'light' | 'dark' | 'system';
    primaryColor?: string;
    phone?: string;
  }
}
