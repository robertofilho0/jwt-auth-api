import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  changePasswordSchema,
  changeRoleSchema,
  listUsersSchema,
  updateMeSchema,
  uuidSchema,
  type ChangePasswordInput,
  type ChangeRoleInput,
  type ListUsersQuery,
  type UpdateMeInput,
} from './users.schemas.js';
import { UsersService } from './users.service.js';

@ApiTags('Usuários')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body({ schema: updateMeSchema }) body: UpdateMeInput,
  ) {
    return this.users.updateMe(user.id, body);
  }

  @Patch('me/password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body({ schema: changePasswordSchema }) body: ChangePasswordInput,
  ) {
    return this.users.changePassword(user.id, body);
  }

  @Roles('ADMIN')
  @Get()
  list(@Query({ schema: listUsersSchema }) query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Roles('ADMIN')
  @Patch(':id/role')
  changeRole(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: uuidSchema }) id: string,
    @Body({ schema: changeRoleSchema }) body: ChangeRoleInput,
  ) {
    return this.users.changeRole(user.id, id, body);
  }
}
