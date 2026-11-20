import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter ao menos 8 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres')
  .regex(/[a-z]/, 'A senha deve conter uma letra minúscula')
  .regex(/[A-Z]/, 'A senha deve conter uma letra maiúscula')
  .regex(/\d/, 'A senha deve conter um número');

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9_.]{3,30}$/,
        'username deve ter 3 a 30 caracteres (letras, números, _ ou .)',
      ),
    email: z.email('E-mail inválido').trim().toLowerCase(),
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    login: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'Informe o username ou e-mail'),
    password: z.string().min(1, 'Informe a senha'),
  })
  .strict();

export const refreshSchema = z
  .object({ refreshToken: z.string().min(20, 'refreshToken inválido') })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
