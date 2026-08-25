import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dtos/role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    const existingRole = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('El nombre del rol ya existe');
    }

    const { permissionIds, ...roleData } = createRoleDto;

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({ data: roleData });

      if (permissionIds && permissionIds.length > 0) {
        await Promise.all(
          permissionIds.map(permissionId =>
            tx.rolePermission.create({
              data: { roleId: role.id, permissionId },
            })
          )
        );
      }

      return this.findOne(role.id);
    });
  }

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        userRoles: {
          include: { user: true },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        userRoles: {
          include: { user: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return role;
  }

  async findPermissions(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return role.rolePermissions.map(rp => rp.permission);
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    await this.findOne(id);

    const { permissionIds, ...roleData } = updateRoleDto;

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.update({
        where: { id },
        data: roleData,
      });

      if (permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (permissionIds.length > 0) {
          await Promise.all(
            permissionIds.map(permissionId =>
              tx.rolePermission.create({ data: { roleId: id, permissionId } })
            )
          );
        }
      }

      return this.findOne(id);
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.role.delete({ where: { id } });
  }

  async assignPermission(roleId: number, permissionId: number) {
    await this.findOne(roleId);
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) {
      throw new NotFoundException(`Permiso con ID ${permissionId} no encontrado`);
    }

    return this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  }

  async removePermission(roleId: number, permissionId: number) {
    await this.findOne(roleId);
    return this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }
}