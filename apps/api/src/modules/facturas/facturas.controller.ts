import { Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { FacturasService } from './facturas.service';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@Controller('facturas')
@CheckAbility({ action: Action.Read, subject: 'Invoice' })
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Get('notas/:id/pdf')
  async pdfNota(
    @Param('id') id: string,
    @Res() res: Response,
    @Query('printType') printType?: string,
  ): Promise<void> {
    const notaId = Number(id);
    if (!Number.isInteger(notaId) || notaId <= 0) {
      throw new NotFoundException(`Nota de venta con id ${id} no encontrada`);
    }
    const buffer = await this.facturasService.generarPdfNota(notaId, printType);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="nota-venta-${notaId}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  }

  @Get(':id/pdf')
  async pdf(
    @Param('id') id: string,
    @Res() res: Response,
    @Query('printType') printType?: string,
  ): Promise<void> {
    const facturaId = Number(id);
    if (!Number.isInteger(facturaId) || facturaId <= 0) {
      throw new NotFoundException(`Factura con id ${id} no encontrada`);
    }
    const buffer = await this.facturasService.generarPdf(facturaId, printType);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="factura-${facturaId}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  }
}