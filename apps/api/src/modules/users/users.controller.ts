import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignRoleDto, AssignPermissionDto } from './dtos/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaslGuard } from '../authorization/casl.guard';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CaslGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @CheckAbility({ action: Action.Create, subject: 'User' })
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @CheckAbility({ action: Action.Read, subject: 'User' })
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @CheckAbility({ action: Action.Read, subject: 'User' })
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Get(':id/permissions')
  @CheckAbility({ action: Action.Read, subject: 'User' })
  @ApiOperation({ summary: 'Obtener permisos efectivos del usuario' })
  findPermissions(@Param('id') id: string) {
    return this.usersService.findPermissions(+id);
  }

  @Patch(':id')
  @CheckAbility({ action: Action.Update, subject: 'User' })
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Put(':id')
  @CheckAbility({ action: Action.Update, subject: 'User' })
  @ApiOperation({ summary: 'Actualizar usuario (PUT)' })
  updatePut(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @CheckAbility({ action: Action.Delete, subject: 'User' })
  @ApiOperation({ summary: 'Eliminar usuario' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Post(':id/roles')
  @CheckAbility({ action: Action.Update, subject: 'User' })
  @ApiOperation({ summary: 'Asignar rol a usuario' })
  assignRole(@Param('id') id: string, @Body() assignRoleDto: AssignRoleDto) {
    return this.usersService.assignRole(+id, assignRoleDto.roleId);
  }

  @Delete(':id/roles/:roleId')
  @CheckAbility({ action: Action.Update, subject: 'User' })
  @ApiOperation({ summary: 'Remover rol de usuario' })
  removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.usersService.removeRole(+id, +roleId);
  }

  @Post(':id/permissions')
  @CheckAbility({ action: Action.Update, subject: 'User' })
  @ApiOperation({ summary: 'Asignar permiso directo a usuario' })
  assignPermission(@Param('id') id: string, @Body() assignPermissionDto: AssignPermissionDto) {
    return this.usersService.assignPermission(+id, assignPermissionDto.permissionId);
  }

  @Delete(':id/permissions/:permissionId')
  @CheckAbility({ action: Action.Update, subject: 'User' })
  @ApiOperation({ summary: 'Remover permiso directo de usuario' })
  removePermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.usersService.removePermission(+id, +permissionId);
  }
}