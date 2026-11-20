import {
  BadRequestException,
  StandardSchemaValidationPipe,
} from '@nestjs/common';

type Issue = {
  message: string;
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
};

const campo = (issue: Issue) =>
  (issue.path ?? [])
    .map((p) => (typeof p === 'object' ? String(p.key) : String(p)))
    .join('.') || undefined;

/** Pipe global de validação (Zod via Standard Schema) com erros padronizados em português. */
export const validationPipe = () =>
  new StandardSchemaValidationPipe({
    exceptionFactory: (issues: ReadonlyArray<Issue>) =>
      new BadRequestException({
        statusCode: 400,
        message: 'Dados inválidos',
        errors: issues.map((issue) => ({
          campo: campo(issue),
          mensagem: issue.message,
        })),
      }),
  });
