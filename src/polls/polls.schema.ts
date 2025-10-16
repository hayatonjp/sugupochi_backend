import { z } from 'zod'

export const createPollSchema = z.object({
  // 'title' => 'required|string|max:100'
  title: z.string()
    .min(1, { message: 'タイトルは必須です。' })
    .max(100, { message: 'タイトルは100文字以内で入力してください。' }),

  // 'description' => 'nullable|string|max:300'
  description: z.string()
    .max(300, { message: '説明文は300文字以内で入力してください。' })
    .optional()
    .nullable(),

  // 'expires_at' => 'nullable|date'
  // z.coerce.date() は文字列をDateオブジェクトに変換しようと試みます
  expires_at: z.coerce.date()
    .refine(
      (date) => date instanceof Date && !isNaN(date.getTime()),
      { message: '有効な日付を入力してください。' }
    )
    .optional()
    .nullable(),
  
  // 'options' => 'required' (配列で、最低2つの選択肢があると仮定)
  options: z.array(
      z.string().min(1, { message: '選択肢は空にできません。' })
    )
    .min(2, { message: '選択肢は最低2つ必要です。' }),

  // 'passcode' => 'nullable|string|max:10'
  passcode: z.string()
    .max(10, { message: 'パスコードは10文字以内で入力してください。' })
    .optional()
    .nullable(),
});