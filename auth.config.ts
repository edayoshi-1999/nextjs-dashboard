import type { NextAuthConfig } from 'next-auth';
 
export const authConfig = {
  pages: {
    signIn: '/login', //カスタムログインページ
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

      //ユーザーがダッシュボードにいて、ログインしている場合はtrueを返す
    //ユーザーがダッシュボードにいて、ログインしていない場合はfalseを返す
    //ユーザーがログインしていて、ダッシュボードにいない場合は、ダッシュボードにリダイレクトする
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;