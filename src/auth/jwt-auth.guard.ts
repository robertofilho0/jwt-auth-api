import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { IS_PUBLIC } from '../common/decorators/public.decorator.js';
import type { AccessPayload } from './token.service.js';

/** Guard global: exige `Authorization: Bearer <token>`, exceto em rotas @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token)
      throw new UnauthorizedException('Token não fornecido');

    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token);
      request.user = { id: payload.sub, role: payload.role };
      return true;
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof TokenExpiredError
          ? 'Token expirado'
          : 'Token inválido',
      );
    }
  }
}
