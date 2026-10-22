import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SiatConfigService } from './siat-config.service';
import { SiatSoapClient } from './siat-soap.client';
import { DISABLE, ENABLE } from '../../common/siat.constants';

@Injectable()
export class SiatService {
  private readonly logger = new Logger(SiatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: SiatConfigService,
    private readonly soap: SiatSoapClient,
  ) {}

  async solicitarCufd(params: {
    cuisId: number;
    pointSaleId: number;
    branchOfficeId: number;
  }) {
    const { cuisId, pointSaleId, branchOfficeId } = params;

    const cuis = await this.prisma.cuis.findUnique({ where: { id: cuisId } });
    if (!cuis) throw new NotFoundException('CUIS no encontrado');

    const pointSale = await this.prisma.pointSale.findUnique({ where: { id: pointSaleId } });
    const branchOffice = await this.prisma.branchOffice.findUnique({ where: { id: branchOfficeId } });
    if (!pointSale || !branchOffice) {
      throw new BadRequestException('Punto de venta o sucursal no encontrados');
    }

    await this.prisma.cufd.updateMany({
      where: { pointSaleId, branchOfficeId, state: ENABLE },
      data: { state: DISABLE, state2: DISABLE, state3: DISABLE },
    });

    const cfg = await this.config.get();
    let code: string;
    let controlCode = cuis.code;
    let address = '';
    let fechaVigencia = new Date(Date.now() + 24 * 3600 * 1000);
    let transaction = true;

    if (!cfg.enabled) {
      code = `CUF${Date.now().toString(16).toUpperCase()}`;
    } else {
      const resp = await this.soap.solicitudCufd(cfg, {
        codigoPuntoVenta: pointSale.pointSaleCode,
        codigoSucursal: branchOffice.code,
        cuis: cuis.code,
      });

      if (!resp.codigo && !resp.transaccion) {
        const errores = (resp.mensajes ?? [])
          .map((m) => `${m.codigo ?? ''} ${m.descripcion ?? ''}`.trim())
          .filter(Boolean)
          .join('; ');
        throw new BadRequestException(
          `El SIAT rechazó la solicitud de CUFD: ${errores}`,
        );
      }
      code = resp.codigo ?? '';
      controlCode = resp.codigoControl ?? cuis.code;
      address = resp.direccion ?? '';
      if (resp.fechaVigencia) fechaVigencia = new Date(resp.fechaVigencia);
      transaction = resp.transaccion || !!resp.codigo;
    }

    const carbonHour1 = new Date(fechaVigencia);
    carbonHour1.setDate(carbonHour1.getDate() - 1);

    const carbonHour2 = new Date(carbonHour1);
    carbonHour2.setHours(carbonHour2.getHours() + 72);

    const carbonHour3 = new Date(carbonHour1);
    carbonHour3.setDate(carbonHour3.getDate() + 15);

    const cufd = await this.prisma.cufd.create({
      data: {
        code,
        controlCode,
        address: (address || branchOffice?.address) ?? '',
        startDate: carbonHour1,
        effectiveDate: fechaVigencia,
        effectiveDate2: carbonHour2,
        effectiveDate3: carbonHour3,
        transaction,
        state: ENABLE,
        state2: ENABLE,
        state3: ENABLE,
        cuisId,
        pointSaleId,
        branchOfficeId,
      },
    });

    this.logger.log(`CUFD generado: ${code} (branch=${branchOfficeId}, pointSale=${pointSaleId})`);
    return cufd;
  }
}
