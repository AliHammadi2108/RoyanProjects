import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      nameAr?: string;
      userNo?: string;
      username?: string;
      roles?: string[];
    };
  }

  interface User {
    nameAr?: string;
    userNo?: string;
    username?: string;
    roles?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    nameAr?: string;
    userNo?: string;
    username?: string;
    roles?: string[];
  }
}
