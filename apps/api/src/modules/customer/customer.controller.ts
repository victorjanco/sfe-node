import { Body, Controller, Get, NotFoundException, Post, Put, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DISABLE } from '../../common/siat.constants';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@Controller('customer')
@CheckAbility({ action: Action.Read, subject: 'Customer' })
export class CustomerController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('get_list_enabled')
  async getListEnabled() {
    return this.prisma.customer.findMany({ where: { state: 1 } });
  }

  @Get('enabled_customer')
  async enabledCustomer() {
    return this.prisma.customer.findMany({ where: { state: 1 } });
  }

  @Get('autocomplete_customer')
  async autocomplete(@Query('search') search?: string) {
    if (!search) return [];
    return this.prisma.customer.findMany({
      where: {
        state: 1,
        OR: [
          { nit: { contains: search } },
          { invoiceName: { contains: search } },
          { name: { contains: search } },
        ],
      },
      orderBy: { id: 'desc' },
      take: 20,
    });
  }

  @Get('select_customer')
  async select(@Query('nit') nit?: string) {
    const customer = await this.prisma.customer.findFirst({ where: { nit: nit ?? '', state: 1 } });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  @Get()
  async index(@Query('search') search?: string, @Query('criterion') criterion?: string) {
    return this.prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { nit: { contains: search } },
              { invoiceName: { contains: search } },
              { name: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { id: 'desc' },
    });
  }

  @CheckAbility({ action: Action.Create, subject: 'Customer' })
  @Post('store')
  async store(@Body() body: any) {
    const { code, ...data } = body;
    const maxCode = (await this.prisma.customer.aggregate({ _max: { code: true } }))._max.code ?? 0;
    return this.prisma.customer.create({
      data: { state: 1, synchronized: 0, code: code ?? maxCode + 1, ...data },
    });
  }

  @CheckAbility({ action: Action.Update, subject: 'Customer' })
  @Put('update')
  async update(@Body() body: any) {
    const { id, ...data } = body;
    return this.prisma.customer.update({ where: { id }, data });
  }

  @CheckAbility({ action: Action.Update, subject: 'Customer' })
  @Put('disable')
  async disable(@Body() body: any) {
    return this.prisma.customer.update({ where: { id: body.id }, data: { state: DISABLE } });
  }

  @CheckAbility({ action: Action.Update, subject: 'Customer' })
  @Put('enable')
  async enable(@Body() body: any) {
    return this.prisma.customer.update({ where: { id: body.id }, data: { state: 1 } });
  }
}