import { z } from 'zod';

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
    newPassword: z.string().min(6, 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'),
    confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'كلمة المرور الجديدة وتأكيدها غير متطابقين',
        path: ['confirmPassword'],
      });
    }
    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية',
        path: ['newPassword'],
      });
    }
  });

export const resetUserPasswordSchema = z
  .object({
    userId: z.string().min(1, 'المستخدم مطلوب'),
    newPassword: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'كلمة المرور وتأكيدها غير متطابقين',
        path: ['confirmPassword'],
      });
    }
  });

export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;
