import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../config/env.js';
import type { Role, User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export interface AccessPayload {
  sub: string;
  role: Role;
}

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async issue(
    user: Pick<User, 'id' | 'role'>,
    meta: SessionMeta = {},
    family: string = randomUUID(),
  ): Promise<Tokens> {
    const refreshToken = randomBytes(48).toString('base64url');
    const ttlDays = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        family,
        expiresAt: new Date(Date.now() + ttlDays * DAY_MS),
        userAgent: meta.userAgent?.slice(0, 300),
        ip: meta.ip,
      },
    });

    const payload: AccessPayload = { sub: user.id, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get('JWT_EXPIRES_IN', { infer: true }),
    };
  }

  /**
   * Rotação: o refresh token usado é revogado e substituído por um novo.
   * Se um token já revogado reaparecer (possível roubo), toda a família é revogada.
   */
  async rotate(refreshToken: string, meta: SessionMeta) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Refresh token inválido');

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Refresh token reutilizado. Sessão encerrada por segurança',
      );
    }
    if (stored.expiresAt <= new Date())
      throw new UnauthorizedException('Refresh token expirado');

    // Revoga de forma condicional para que duas rotações simultâneas não passem juntas
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw new UnauthorizedException('Refresh token inválido');

    const tokens = await this.issue(stored.user, meta, stored.family);
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { replacedBy: sha256(tokens.refreshToken) },
    });
    return { user: stored.user, tokens };
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  activeSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        family: true,
        userAgent: true,
        ip: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
