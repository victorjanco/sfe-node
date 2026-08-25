import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { CheckAbility } from './modules/authorization/decorators/check-ability.decorator';
import { Action } from './modules/authorization/enums/action.enum';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @CheckAbility({ action: Action.Read, subject: 'Siat' })
  @Get('control-code')
  controlCode(
    @Query('authorizationNumber') authorizationNumber: string,
    @Query('invoiceNumber') invoiceNumber: string,
    @Query('nit') nit: string,
    @Query('date') date: string,
    @Query('amount') amount: string,
    @Query('dosageKey') dosageKey: string,
  ): { code: string } {
    const code = this.appService.generateControlCode({
      authorizationNumber,
      invoiceNumber,
      nit,
      date,
      amount,
      dosageKey,
    });
    return { code };
  }
}