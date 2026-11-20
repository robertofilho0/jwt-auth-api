import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { TokenService } from '../auth/token.service.js';
import type { Env } from '../config/env.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ChangePasswordInput,
  ChangeRoleInput,
  ListUsersQuery,
  UpdateMeInput,
} from './users.schemas.js';

export type PublicUser = Omit<User, 'passwordHash'>;

/** Remove o hash da senha antes de devolver o usuário na API. */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _hash, ...rest } = user;
  return rest;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private async findOrFail(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async me(id: string) {
    return toPublicUser(await this.findOrFail(id));
  }

  async updateMe(id: string, data: UpdateMeInput) {
    await this.findOrFail(id);
    return toPublicUser(await this.prisma.user.update({ where: { id }, data }));
  }

  async changePassword(
    id: string,
    { currentPassword, newPassword }: ChangePasswordInput,
  ) {
    const user = await this.findOrFail(id);
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Senha atual incorreta');
    }

    const rounds = this.config.get('BCRYPT_ROUNDS', { infer: true });
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(newPassword, rounds) },
    });
    await this.tokens.revokeAll(id); // encerra as sessões existentes
    return {
      message: 'Senha alterada. Faça login novamente nos outros dispositivos.',
    };
  }

  async list({ page, limit, role }: ListUsersQuery) {
    const where = role ? { role } : {};
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data: users.map(toPublicUser),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async changeRole(actorId: string, id: string, { role }: ChangeRoleInput) {
    if (actorId === id)
      throw new BadRequestException('Você não pode alterar o próprio papel');
    await this.findOrFail(id);
    return toPublicUser(
      await this.prisma.user.update({ where: { id }, data: { role } }),
    );
  }
}
