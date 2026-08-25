import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dtos/role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaslGuard } from '../authorization/casl.guard';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CaslGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @CheckAbility({ action: Action.Create, subject: 'Role' })
  @ApiOperation({ summary: 'Crear rol' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @CheckAbility({ action: Action.Read, subject: 'Role' })
  @ApiOperation({ summary: 'Listar roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @CheckAbility({ action: Action.Read, subject: 'Role' })
  @ApiOperation({ summary: 'Obtener rol por ID' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }

  @Get(':id/permissions')
  @CheckAbility({ action: Action.Read, subject: 'Role' })
  @ApiOperation({ summary: 'Obtener permisos del rol' })
  findPermissions(@Param('id') id: string) {
    return this.rolesService.findPermissions(+id);
  }

  @Patch(':id')
  @CheckAbility({ action: Action.Update, subject: 'Role' })
  @ApiOperation({ summary: 'Actualizar rol' })
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(+id, updateRoleDto);
  }

  @Delete(':id')
  @CheckAbility({ action: Action.Delete, subject: 'Role' })
  @ApiOperation({ summary: 'Eliminar rol' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }

  @Post(':id/permissions')
  @CheckAbility({ action: Action.Update, subject: 'Role' })
  @ApiOperation({ summary: 'Asignar permiso a rol' })
  assignPermission(@Param('id') id: string, @Body() assignPermissionDto: AssignPermissionDto) {
    return this.rolesService.assignPermission(+id, assignPermissionDto.permissionId);
  }

  @Delete(':id/permissions/:permissionId')
  @CheckAbility({ action: Action.Update, subject: 'Role' })
  @ApiOperation({ summary: 'Remover permiso de rol' })
  removePermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.rolesService.removePermission(+id, +permissionId);
  }
}