import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SaleService } from './sale.service';
import { SaleStoreDto } from './dto/sale.dto';
import { SaleQueryDto } from './dto/sale-query.dto';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@Controller('sale')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @CheckAbility({ action: Action.Read, subject: 'Sale' })
  @Get('get_type_money_sale')
  async getTypeMoneySale() {
    return this.saleService.getTypeMoneySale();
  }

  @CheckAbility({ action: Action.Read, subject: 'Sale' })
  @Get()
  async index(@Query() q: SaleQueryDto) {
    return this.saleService.index(q);
  }

  @CheckAbility({ action: Action.Read, subject: 'Report' })
  @Get('export')
  async export(@Query() q: SaleQueryDto, @Res() res: Response) {
    const buffer = await this.saleService.exportExcel(q);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte-ventas-${stamp}.xlsx"`,
    );
    res.send(buffer);
  }

  @CheckAbility({ action: Action.Read, subject: 'NoteSale' })
  @Get('notes')
  async notasVenta() {
    return this.saleService.notasVenta();
  }

  @CheckAbility({ action: Action.Create, subject: 'Sale' })
  @Post('store')
  async store(@Body() body: SaleStoreDto) {
    return this.saleService.store(body);
  }

  @CheckAbility({ action: Action.Create, subject: 'NoteSale' })
  @Post('store_note')
  async storeNote(@Body() body: SaleStoreDto) {
    return this.saleService.storeNote(body);
  }
}
