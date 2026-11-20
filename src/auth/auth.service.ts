import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPublicUser } from '../users/users.service.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { SessionMeta, TokenService } from './token.service.js';

// Hash fixo usado quando o usuário não existe, para que o tempo de resposta
// seja parecido e não revele quais contas existem.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 4);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(input: RegisterInput, meta: SessionMeta) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ username: input.username }, { email: input.email }] },
      select: { username: true },
    });
    if (exists) {
      throw new ConflictException(
        exists.username === input.username
          ? 'username já está em uso'
          : 'e-mail já está em uso',
      );
    }

    const { password, ...data } = input;
    const user = await this.prisma.user.create({
      data: {
        ...data,
        passwordHash: await bcrypt.hash(
          password,
          this.config.get('BCRYPT_ROUNDS', { infer: true }),
        ),
      },
    });
    return {
      user: toPublicUser(user),
      ...(await this.tokens.issue(user, meta)),
    };
  }

  async login({ login, password }: LoginInput, meta: SessionMeta) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: login }, { email: login }] },
    });
    const valid = await bcrypt.compare(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid)
      throw new UnauthorizedException('Credenciais inválidas');

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      user: toPublicUser(updated),
      ...(await this.tokens.issue(updated, meta)),
    };
  }

  async refresh(refreshToken: string, meta: SessionMeta) {
    const { user, tokens } = await this.tokens.rotate(refreshToken, meta);
    return { user: toPublicUser(user), ...tokens };
  }
}
