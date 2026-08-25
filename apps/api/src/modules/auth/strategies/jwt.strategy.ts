import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { jwtConfig } from '../auth.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    });
  }

  async validate(payload: { sub: number; username: string; roles: string[]; permissions: string[]; branchOfficeId?: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const rolePermissions = user.userRoles.flatMap((ur: any) =>
      ur.role.rolePermissions.map((rp: any) => rp.permission.name)
    );
    const directPermissions = user.userPermissions.map((up: any) => up.permission.name);
    const allPermissions = [...new Set([...rolePermissions, ...directPermissions])];

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      roles: user.userRoles.map((ur: any) => ur.role.name),
      permissions: allPermissions,
      branchOfficeId: payload.branchOfficeId,
    };
  }
}