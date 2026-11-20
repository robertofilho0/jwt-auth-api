import { z } from 'zod';

const isTest = process.env.NODE_ENV === 'test';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  CORS_ORIGIN: z.string().default('*'),
  JWT_SECRET: isTest
    ? z.string().default('test-secret-test-secret-test-secret')
    : z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_ROUNDS: z.coerce
    .number()
    .int()
    .min(4)
    .max(15)
    .default(isTest ? 4 : 12),
});

export type Env = z.infer<typeof envSchema>;

/** Usado pelo ConfigModule: falha na inicialização se o ambiente for inválido. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${detalhes}`);
  }
  return parsed.data;
}
