import { z } from 'zod';
import { passwordSchema } from '../auth/auth.schemas.js';

export const updateMeSchema = z
  .object({ name: z.string().trim().min(2).max(80) })
  .strict();

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1), newPassword: passwordSchema })
  .strict()
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['newPassword'],
  });

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['USER', 'ADMIN']).optional(),
});

export const changeRoleSchema = z
  .object({ role: z.enum(['USER', 'ADMIN']) })
  .strict();

export const uuidSchema = z.uuid('ID inválido');

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ListUsersQuery = z.infer<typeof listUsersSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
