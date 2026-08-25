import { SetMetadata } from '@nestjs/common';
import { Action } from '../enums/action.enum';

export interface RequiredRule {
  action: Action;
  subject: string;
}

export const CHECK_ABILITY = 'check_ability';
export const CheckAbility = (...requirements: RequiredRule[]) =>
  SetMetadata(CHECK_ABILITY, requirements);