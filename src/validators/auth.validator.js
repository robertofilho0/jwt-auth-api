const { z } = require('zod');
const { ROLES } = require('../models/User');

const password = z
  .string()
  .min(8, 'A senha deve ter ao menos 8 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres')
  .regex(/[a-z]/, 'A senha deve conter uma letra minúscula')
  .regex(/[A-Z]/, 'A senha deve conter uma letra maiúscula')
  .regex(/\d/, 'A senha deve conter um número');

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,30}$/, 'username deve ter 3 a 30 caracteres (letras, números, _ ou .)');

const register = z
  .object({
    name: z.string().trim().min(2).max(80),
    username,
    email: z.email('E-mail inválido').trim().toLowerCase(),
    password,
  })
  .strict();

const login = z
  .object({
    login: z.string().trim().toLowerCase().min(3, 'Informe o username ou e-mail'),
    password: z.string().min(1, 'Informe a senha'),
  })
  .strict();

const refresh = z.object({ refreshToken: z.string().min(20, 'refreshToken inválido') }).strict();

const updateMe = z.object({ name: z.string().trim().min(2).max(80) }).strict();

const changePassword = z
  .object({ currentPassword: z.string().min(1), newPassword: password })
  .strict()
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['newPassword'],
  });

const listUsers = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(ROLES).optional(),
});

const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'ID inválido') });
const changeRole = z.object({ role: z.enum(ROLES) }).strict();

module.exports = {
  register,
  login,
  refresh,
  updateMe,
  changePassword,
  listUsers,
  idParams,
  changeRole,
};
