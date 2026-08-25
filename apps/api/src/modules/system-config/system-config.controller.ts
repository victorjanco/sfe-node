import { Body, Controller, Get, Post } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@Controller('system')
@CheckAbility({ action: Action.Manage, subject: 'all' })
export class SystemConfigController {
  constructor(private readonly systemConfig: SystemConfigService) {}

  @Get('config')
  async overview() {
    return this.systemConfig.getOverview();
  }

  @Post('config/company')
  async updateCompany(@Body() body: any) {
    return this.systemConfig.updateCompany(body);
  }

  @Post('config/branch_office')
  async updateBranch(@Body() body: any) {
    return this.systemConfig.updateBranchOffice(body);
  }

  @Post('config/point_sale')
  async updatePoint(@Body() body: any) {
    return this.systemConfig.updatePointSale(body);
  }

  @Post('config/token')
  async upsertToken(@Body() body: any) {
    return this.systemConfig.upsertToken(body);
  }
}
