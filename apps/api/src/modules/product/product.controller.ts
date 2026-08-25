import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DISABLE } from '../../common/siat.constants';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@Controller('product')
@CheckAbility({ action: Action.Read, subject: 'Product' })
export class ProductController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('get_list_enabled')
  async getListEnabled() {
    return this.prisma.product.findMany({ where: { state: 1 } });
  }

  @Get('autocomplete_product')
  async autocomplete(@Query('search') search?: string) {
    if (!search) return [];
    return this.prisma.product.findMany({
      where: {
        state: 1,
        OR: [
          { code: { contains: search } },
          { tradename: { contains: search } },
          { genericName: { contains: search } },
        ],
      },
      include: { unitMeasure: true },
      orderBy: { id: 'desc' },
      take: 20,
    });
  }

  @Get()
  async index(@Query('search') search?: string) {
    return this.prisma.product.findMany({
      where: search
        ? {
            OR: [
              { code: { contains: search } },
              { tradename: { contains: search } },
              { genericName: { contains: search } },
            ],
          }
        : undefined,
      include: { unitMeasure: true },
      orderBy: { id: 'desc' },
    });
  }

  @CheckAbility({ action: Action.Create, subject: 'Product' })
  @Post('store')
  async store(@Body() body: any) {
    return this.prisma.product.create({ data: { state: 1, ...body } });
  }

  @CheckAbility({ action: Action.Update, subject: 'Product' })
  @Put('update')
  async update(@Body() body: any) {
    const { id, ...data } = body;
    return this.prisma.product.update({ where: { id }, data });
  }

  @CheckAbility({ action: Action.Update, subject: 'Product' })
  @Put('disable')
  async disable(@Body() body: any) {
    return this.prisma.product.update({ where: { id: body.id }, data: { state: DISABLE } });
  }

  @CheckAbility({ action: Action.Update, subject: 'Product' })
  @Put('enable')
  async enable(@Body() body: any) {
    return this.prisma.product.update({ where: { id: body.id }, data: { state: 1 } });
  }
}