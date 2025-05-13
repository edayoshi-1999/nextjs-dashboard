import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

// アプリケーション終了時に接続を閉じる
process.on('SIGINT', async () => {
  console.log('Closing database connection...');
  await sql.end();
  process.exit(0);
});

// ユーザー情報を取得する関数
// ここでは、メールアドレスを使用してユーザー情報を取得する。
async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;
    return user[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // メールとパスワードで認証するプロバイダーを追加
    // ここでは、zodを使用してバリデーションを行う。
    // これにより、ユーザーが入力したメールアドレスとパスワードが正しい形式であることを確認する。
    // さらに、bcryptを使用してパスワードをハッシュ化して比較する。
    //一致する場合、ユーザー情報を返す。それ以外の場合は、nullを返す。
    Credentials({
    
      async authorize(credentials) {

        // ログインフォームの入力値（メールとパスワード）をバリデーションして、正しい形式かどうかをチェックする
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        //バリデーションに成功した場合
        // ここでは、メールアドレスを使用してユーザー情報を取得する。
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);

          // ユーザーが存在しない場合
          if (!user) return null;
        
          // bcryptを使用して、パスワードをハッシュ化して比較する
          //入力されたパスワードpasswordとデータベースに保存されているハッシュ化されたパスワードuser.passwordを比較する
          const passwordsMatch = await bcrypt.compare(password, user.password);
            
          //パスワードが一致する場合、ユーザー情報を返す
          if (passwordsMatch) return user;
        }

        // バリデーションに失敗した場合、またはパスワードが一致しない場合
        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
});