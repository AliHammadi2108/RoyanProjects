import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      username?: string;
      roles?: string[];
    };
  }

  interface User {
    username?: string;
    roles?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    username?: string;
    roles?: string[];
  }
}
