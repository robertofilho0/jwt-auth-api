import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
} from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';

const meta = (req: Request) => ({
  userAgent: req.get('user-agent'),
  ip: req.ip,
});

// Limite mais rígido contra força bruta em login e cadastro
const CREDENTIALS_LIMIT = { default: { limit: 10, ttl: 15 * 60_000 } };

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  @Public()
  @Throttle(CREDENTIALS_LIMIT)
  @Post('register')
  register(
    @Body({ schema: registerSchema }) body: RegisterInput,
    @Req() req: Request,
  ) {
    return this.auth.register(body, meta(req));
  }

  @Public()
  @Throttle(CREDENTIALS_LIMIT)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body({ schema: loginSchema }) body: LoginInput, @Req() req: Request) {
    return this.auth.login(body, meta(req));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(
    @Body({ schema: refreshSchema }) body: RefreshInput,
    @Req() req: Request,
  ) {
    return this.auth.refresh(body.refreshToken, meta(req));
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body({ schema: refreshSchema }) body: RefreshInput) {
    await this.tokens.revoke(body.refreshToken);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: AuthUser) {
    await this.tokens.revokeAll(user.id);
  }

  @ApiBearerAuth()
  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser) {
    return this.tokens.activeSessions(user.id);
  }
}
