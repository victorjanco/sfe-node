import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto, UpdatePermissionDto } from './dtos/permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaslGuard } from '../authorization/casl.guard';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CaslGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @CheckAbility({ action: Action.Create, subject: 'Permission' })
  @ApiOperation({ summary: 'Crear permiso' })
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @Get()
  @CheckAbility({ action: Action.Read, subject: 'Permission' })
  @ApiOperation({ summary: 'Listar permisos' })
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @CheckAbility({ action: Action.Read, subject: 'Permission' })
  @ApiOperation({ summary: 'Obtener permiso por ID' })
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(+id);
  }

  @Patch(':id')
  @CheckAbility({ action: Action.Update, subject: 'Permission' })
  @ApiOperation({ summary: 'Actualizar permiso' })
  update(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
    return this.permissionsService.update(+id, updatePermissionDto);
  }

  @Delete(':id')
  @CheckAbility({ action: Action.Delete, subject: 'Permission' })
  @ApiOperation({ summary: 'Eliminar permiso' })
  remove(@Param('id') id: string) {
    return this.permissionsService.remove(+id);
  }
}