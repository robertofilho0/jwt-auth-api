import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { validationPipe } from './validation.js';

describe('validationPipe', () => {
  const schema = z.object({
    email: z.email('E-mail inválido'),
    idade: z.coerce.number().min(18),
  });
  const meta = { type: 'body' as const, schema };

  it('devolve o valor convertido pelo schema', async () => {
    await expect(
      validationPipe().transform({ email: 'a@b.com', idade: '20' }, meta),
    ).resolves.toEqual({
      email: 'a@b.com',
      idade: 20,
    });
  });

  it('padroniza os erros por campo', async () => {
    const erro = await validationPipe()
      .transform({ email: 'x', idade: 10 }, meta)
      .catch((e: BadRequestException) => e.getResponse());
    expect(erro).toMatchObject({
      statusCode: 400,
      message: 'Dados inválidos',
      errors: [
        { campo: 'email', mensagem: 'E-mail inválido' },
        { campo: 'idade', mensagem: expect.any(String) },
      ],
    });
  });
});
