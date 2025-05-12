'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

 
const sql = postgres(process.env.POSTGRES_URL!, { ssl: false });

// アプリケーション終了時に接続を閉じる
process.on('SIGINT', async () => {
  console.log('Closing database connection...');
  await sql.end();
  process.exit(0);
});

const FormSchema = z.object({
  id: z.string(),
//   customerId: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
//   amount: z.coerce.number(),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
//   status: z.enum(['pending', 'paid']),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});


const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });


export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice( prevState: State, formData: FormData) {

    // 型安全にするために、zodを使用してバリデーションを行う。
    const validatedFields = CreateInvoice.safeParse({
    // const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    // バリデーションに失敗した場合、エラーメッセージを表示する。
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }

    // バリデーションに成功した場合、データを取得する。
    const { customerId, amount, status } = validatedFields.data;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amount}, ${status}, ${date})
        `;
      } catch (error) {
        // データベースエラーをキャッチして、エラーメッセージを表示する。
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    revalidatePath('/dashboard/invoices'); // ここでキャッシュを無効化して、最新のデータを取得するようにします。
    redirect('/dashboard/invoices'); // リダイレクトを行います。


}


export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
        return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Update Invoice.',
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    
    try {   
        await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amount}, status = ${status}
            WHERE id = ${id}
        `;
    } catch (error) {
        return { message: 'Database Error: Failed to Update Invoice.' };
    }
 

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    // throw new Error('Failed to Delete Invoice');    
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
}