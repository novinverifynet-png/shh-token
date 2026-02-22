import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import pool from '@/lib/db';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Read credentials from DB settings table
          const [rows]: any = await pool.query(
            "SELECT key_name, key_value FROM settings WHERE key_name IN ('ADMIN_USERNAME', 'ADMIN_PASSWORD')"
          );

          const settingsMap: Record<string, string> = {};
          for (const row of rows) {
            settingsMap[row.key_name] = row.key_value;
          }

          // Fallback to env if DB not available
          const adminUser = settingsMap['ADMIN_USERNAME'] || process.env.ADMIN_USERNAME || 'admin';
          const adminPass = settingsMap['ADMIN_PASSWORD'] || process.env.ADMIN_PASSWORD || 'admin';

          if (
            credentials?.username === adminUser &&
            credentials?.password === adminPass
          ) {
            return { id: '1', name: 'Admin', email: 'admin@shh.token' };
          }

          return null;
        } catch (err) {
          console.error('[Auth] DB error, falling back to env:', err);
          // Fallback to env if DB fails
          const adminUser = process.env.ADMIN_USERNAME || 'admin';
          const adminPass = process.env.ADMIN_PASSWORD || 'admin';
          if (credentials?.username === adminUser && credentials?.password === adminPass) {
            return { id: '1', name: 'Admin', email: 'admin@shh.token' };
          }
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
  secret: process.env.NEXTAUTH_SECRET || 'shh-token-secret',
});

export { handler as GET, handler as POST };
