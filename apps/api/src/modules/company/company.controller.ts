import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DISABLE } from '../../common/siat.constants';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';
import { Public } from '../../common/decorators/public.decorator';

@Controller('company')
@CheckAbility({ action: Action.Read, subject: 'Company' })
export class CompanyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('get_company')
  async getCompany() {
    const company = await this.prisma.company.findFirst({ where: { state: 1 } });
    if (!company) throw new NotFoundException('No existe una empresa habilitada');
    return company;
  }

  @Get('get_list_enabled')
  async getListEnabled() {
    return this.prisma.company.findMany({ where: { state: 1 } });
  }

  @Get()
  async index() {
    return this.prisma.company.findMany({ orderBy: { id: 'asc' } });
  }

  @CheckAbility({ action: Action.Create, subject: 'Company' })
  @Post('store')
  async store(@Body() body: any) {
    return this.prisma.company.create({ data: { state: 1, ...body } });
  }

  @CheckAbility({ action: Action.Update, subject: 'Company' })
  @Put('update')
  async update(@Body() body: any) {
    const { id, ...data } = body;
    return this.prisma.company.update({ where: { id }, data });
  }

  @CheckAbility({ action: Action.Update, subject: 'Company' })
  @Put('disable')
  async disable(@Body() body: any) {
    return this.prisma.company.update({ where: { id: body.id }, data: { state: DISABLE } });
  }

  @CheckAbility({ action: Action.Update, subject: 'Company' })
  @Put('enable')
  async enable(@Body() body: any) {
    return this.prisma.company.update({ where: { id: body.id }, data: { state: 1 } });
  }
}

@Controller('branch_office')
@CheckAbility({ action: Action.Read, subject: 'BranchOffice' })
export class BranchOfficeController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('get_list_enabled')
  async getListEnabled() {
    return this.prisma.branchOffice.findMany({ where: { state: 1 } });
  }

  @Get()
  async index() {
    return this.prisma.branchOffice.findMany({ orderBy: { id: 'asc' } });
  }

  @CheckAbility({ action: Action.Create, subject: 'BranchOffice' })
  @Post('store')
  async store(@Body() body: any) {
    return this.prisma.branchOffice.create({ data: { state: 1, ...body } });
  }

  @CheckAbility({ action: Action.Update, subject: 'BranchOffice' })
  @Put('update')
  async update(@Body() body: any) {
    const { id, ...data } = body;
    return this.prisma.branchOffice.update({ where: { id }, data });
  }

  @CheckAbility({ action: Action.Update, subject: 'BranchOffice' })
  @Put('disable')
  async disable(@Body() body: any) {
    return this.prisma.branchOffice.update({ where: { id: body.id }, data: { state: DISABLE } });
  }

  @CheckAbility({ action: Action.Update, subject: 'BranchOffice' })
  @Put('enable')
  async enable(@Body() body: any) {
    return this.prisma.branchOffice.update({ where: { id: body.id }, data: { state: 1 } });
  }
}

@Controller('point_sale')
@CheckAbility({ action: Action.Read, subject: 'PointSale' })
export class PointSaleController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('get_list_enabled')
  async getListEnabled() {
    return this.prisma.pointSale.findMany({ where: { state: 1 } });
  }

  @Get()
  async index() {
    return this.prisma.pointSale.findMany({ orderBy: { id: 'asc' } });
  }

  @CheckAbility({ action: Action.Create, subject: 'PointSale' })
  @Post('store')
  async store(@Body() body: any) {
    return this.prisma.pointSale.create({ data: { state: 1, ...body } });
  }

  @CheckAbility({ action: Action.Update, subject: 'PointSale' })
  @Put('update')
  async update(@Body() body: any) {
    const { id, ...data } = body;
    return this.prisma.pointSale.update({ where: { id }, data });
  }

  @CheckAbility({ action: Action.Update, subject: 'PointSale' })
  @Put('disable')
  async disable(@Body() body: any) {
    return this.prisma.pointSale.update({ where: { id: body.id }, data: { state: DISABLE } });
  }

  @CheckAbility({ action: Action.Update, subject: 'PointSale' })
  @Put('enable')
  async enable(@Body() body: any) {
    return this.prisma.pointSale.update({ where: { id: body.id }, data: { state: 1 } });
  }
}

@Controller('token')
@CheckAbility({ action: Action.Read, subject: 'Company' })
export class TokenController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('get_list_enabled')
  async getListEnabled() {
    return this.prisma.token.findMany({ where: { state: 1 } });
  }

  @Get()
  async index() {
    return this.prisma.token.findMany({ orderBy: { id: 'asc' } });
  }

  @CheckAbility({ action: Action.Update, subject: 'Company' })
  @Post('store')
  async store(@Body() body: any) {
    const company = await this.prisma.company.findFirst({ where: { state: 1 } });
    if (!company) throw new NotFoundException('No existe una empresa habilitada');
    return this.prisma.token.create({
      data: {
        value: body.value,
        version: body.version ?? 2,
        state: 1,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        companyId: body.companyId ?? company.id,
      },
    });
  }

  @CheckAbility({ action: Action.Update, subject: 'Company' })
  @Put('update')
  async update(@Body() body: any) {
    const { id, ...data } = body;
    return this.prisma.token.update({
      where: { id: Number(id) },
      data: {
        value: data.value,
        version: data.version,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  @CheckAbility({ action: Action.Update, subject: 'Company' })
  @Put('disable')
  async disable(@Body() body: any) {
    return this.prisma.token.update({ where: { id: Number(body.id) }, data: { state: DISABLE } });
  }

  @CheckAbility({ action: Action.Update, subject: 'Company' })
  @Put('enable')
  async enable(@Body() body: any) {
    return this.prisma.token.update({ where: { id: Number(body.id) }, data: { state: 1 } });
  }
}

@Controller('company/:companyId')
@CheckAbility({ action: Action.Read, subject: 'Company' })
export class CompanyChildController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('branch_office')
  async branchOffices(@Param('companyId') companyId: string) {
    return this.prisma.branchOffice.findMany({ where: { companyId: Number(companyId), state: 1 } });
  }

  @Get('point_sale')
  async pointSales(@Param('companyId') companyId: string) {
    const branches = await this.prisma.branchOffice.findMany({ where: { companyId: Number(companyId) } });
    const ids = branches.map((b) => b.id);
    return this.prisma.pointSale.findMany({ where: { branchOfficeId: { in: ids }, state: 1 } });
  }
}