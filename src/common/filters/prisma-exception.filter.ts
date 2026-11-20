import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

/** Converte erros conhecidos do Prisma em respostas HTTP adequadas. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    error: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();

    const map: Record<string, [HttpStatus, string]> = {
      P2002: [HttpStatus.CONFLICT, 'Já existe um registro com estes dados'],
      P2003: [
        HttpStatus.CONFLICT,
        'O registro está relacionado a outros dados',
      ],
      P2025: [HttpStatus.NOT_FOUND, 'Registro não encontrado'],
    };
    const [status, message] = map[error.code] ?? [
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Erro interno do servidor',
    ];
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Erro do Prisma ${error.code}: ${error.message}`);
    }

    response.status(status).json({ statusCode: status, message });
  }
}
