import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from './dtos/user.dto';

const userInclude = {
  userRoles: {
    include: { role: true },
  },
  userPermissions: {
    include: { permission: true },
  },
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private excludePassword(user: any) {
    const { password, ...result } = user;
    if (user.userRoles) {
      result.userRoles = user.userRoles;
    }
    if (user.userPermissions) {
      result.userPermissions = user.userPermissions;
    }
    return result;
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: createUserDto.username },
          { email: createUserDto.email },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('El username o email ya existe');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const { roleIds, permissionIds, ...userData } = createUserDto;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        },
      });

      if (roleIds && roleIds.length > 0) {
        await Promise.all(
          roleIds.map(roleId =>
            tx.userRole.create({
              data: { userId: user.id, roleId },
            })
          )
        );
      }

      if (permissionIds && permissionIds.length > 0) {
        await Promise.all(
          permissionIds.map(permissionId =>
            tx.userPermission.create({
              data: { userId: user.id, permissionId },
            })
          )
        );
      }

      return this.findOne(user.id);
    });
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: userInclude,
      orderBy: { id: 'asc' },
    });
    return users.map(u => this.excludePassword(u));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return this.excludePassword(user);
  }

  async findPermissions(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        userPermissions: {
          include: { permission: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const rolePermissions = user.userRoles.flatMap(ur =>
      ur.role.rolePermissions.map(rp => rp.permission)
    );
    const directPermissions = user.userPermissions.map(up => up.permission);
    const allPermissions = [...directPermissions];
    for (const perm of rolePermissions) {
      if (!allPermissions.some(p => p.id === perm.id)) {
        allPermissions.push(perm);
      }
    }

    return {
      fromRoles: rolePermissions,
      direct: directPermissions,
      effective: allPermissions,
    };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const { roleIds, permissionIds, password, ...userData } = updateUserDto;

    return this.prisma.$transaction(async (tx) => {
      const updateData: typeof userData & { password?: string } = { ...userData };
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await tx.user.update({
        where: { id },
        data: updateData,
      });

      if (roleIds !== undefined) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        if (roleIds.length > 0) {
          await Promise.all(
            roleIds.map(roleId =>
              tx.userRole.create({ data: { userId: id, roleId } })
            )
          );
        }
      }

      if (permissionIds !== undefined) {
        await tx.userPermission.deleteMany({ where: { userId: id } });
        if (permissionIds.length > 0) {
          await Promise.all(
            permissionIds.map(permissionId =>
              tx.userPermission.create({ data: { userId: id, permissionId } })
            )
          );
        }
      }

      return this.findOne(id);
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }

  async assignRole(userId: number, roleId: number) {
    await this.findOne(userId);
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
    }

    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });
  }

  async removeRole(userId: number, roleId: number) {
    await this.findOne(userId);
    return this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
  }

  async assignPermission(userId: number, permissionId: number) {
    await this.findOne(userId);
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) {
      throw new NotFoundException(`Permiso con ID ${permissionId} no encontrado`);
    }

    return this.prisma.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId } },
      update: {},
      create: { userId, permissionId },
    });
  }

  async removePermission(userId: number, permissionId: number) {
    await this.findOne(userId);
    return this.prisma.userPermission.delete({
      where: { userId_permissionId: { userId, permissionId } },
    });
  }
}