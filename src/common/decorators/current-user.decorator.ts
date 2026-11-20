import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client.js';

export interface AuthUser {
  id: string;
  role: Role;
}

/** Injeta o usuário autenticado (vindo do access token). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
