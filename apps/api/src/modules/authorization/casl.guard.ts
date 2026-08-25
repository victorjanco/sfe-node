import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, AppAbility } from './casl-ability.factory';
import { CHECK_ABILITY, RequiredRule } from './decorators/check-ability.decorator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const rules = this.reflector.getAllAndOverride<RequiredRule[]>(CHECK_ABILITY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rules) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const ability = this.caslAbilityFactory.createForUser(user);

    const hasPermission = rules.every((rule) =>
      ability.can(rule.action, rule.subject)
    );

    if (!hasPermission) {
      throw new ForbiddenException('No tiene permisos para realizar esta acción');
    }

    return true;
  }
}