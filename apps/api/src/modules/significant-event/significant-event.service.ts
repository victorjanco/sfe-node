import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SiatEmisionClient } from '../siat/siat-emision.client';
import {
  EMISSION_OFFLINE, EMISSION_ONLINE, NO_CONTINGENCY, INVOICE_STATE_VALID, SYNC_NO, SYNC_YES,
  SECTOR_COMPRA_VENTA, DOCUMENT_SECTORS_TYPE_INVOICES,
} from '../../common/siat.constants';

@Injectable()
export class SignificantEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siatEmision: SiatEmisionClient,
  ) {}

  async findAll() {
    return this.prisma.significantEvent.findMany({
      include: {
        reasonEvent: true,
        contingencies: { include: { contingency: true } },
        invoices: { include: { invoice: true } },
        packageReceptions: { include: { validations: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async findById(id: number) {
    const event = await this.prisma.significantEvent.findUnique({
      where: { id },
      include: {
        reasonEvent: true,
        contingencies: { include: { contingency: true } },
        invoices: { include: { invoice: true } },
        packageReceptions: { include: { validations: true } },
      },
    });
    if (!event) throw new NotFoundException('Evento significativo no encontrado');
    return event;
  }

  async findEnabled() {
    return this.prisma.significantEvent.findMany({
      where: { state: 1 },
      include: {
        reasonEvent: true,
        contingencies: { include: { contingency: true } },
        invoices: { include: { invoice: true } },
        packageReceptions: { include: { validations: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async create(dto: CreateSignificantEventDto) {
    const { reasonEventId, startDate, endDate, cufdEvent, branchOfficeId, pointSaleId, sectorDocumentId, contingencyId } = dto;

    if (!reasonEventId) throw new BadRequestException('reasonEventId es requerido');
    if (!startDate || !endDate) throw new BadRequestException('startDate y endDate son requeridos');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) throw new BadRequestException('endDate debe ser posterior a startDate');

    const reasonEvent = await this.prisma.reasonEvent.findUnique({ where: { id: reasonEventId } });
    if (!reasonEvent) throw new BadRequestException('reasonEventId no existe');

    const branchOffice = await this.prisma.branchOffice.findUnique({ where: { id: branchOfficeId } });
    if (!branchOffice) throw new BadRequestException('branchOfficeId no existe');

    const pointSale = await this.prisma.pointSale.findFirst({
      where: { branchOfficeId, state: 1 },
    });
    if (!pointSale) throw new BadRequestException('Punto de venta no encontrado');

    if (contingencyId) {
      const contingency = await this.prisma.contingency.findUnique({ where: { id: contingencyId } });
      if (!contingency) throw new BadRequestException('contingencyId no existe');
    }

    const maxNumberResult = await this.prisma.significantEvent.findMany({
      where: { pointSaleId },
      orderBy: { number: 'desc' },
      take: 1,
    });
    const maxNumber = maxNumberResult.length > 0 ? parseInt(maxNumberResult[0].number, 10) : 0;

    const significantEvent = await this.prisma.significantEvent.create({
      data: {
        number: String(maxNumber + 1),
        code: null,
        startDate: start,
        endDate: end,
        transaction: false,
        transactionReceipt: null,
        transactionValidation: null,
        cufdEvent,
        cufd: null,
        reasonEventCode: reasonEvent.classifierCode,
        branchOfficeCode: String(branchOffice.code),
        pointSaleCode: String(pointSale.pointSaleCode),
        reasonEventId,
        branchOfficeId,
        pointSaleId,
        sectorDocumentId: sectorDocumentId ?? null,
      },
    });

    if (contingencyId) {
      await this.prisma.significantEventContingency.create({
        data: {
          significantEventId: significantEvent.id,
          contingencyId,
        },
      });
    }

    return significantEvent;
  }

  async update(id: number, dto: UpdateSignificantEventDto) {
    const event = await this.findById(id);
    const { startDate, endDate, cufdEvent, sectorDocumentId } = dto;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) throw new BadRequestException('endDate debe ser posterior a startDate');
    }

    const updated = await this.prisma.significantEvent.update({
      where: { id },
      data: {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(cufdEvent !== undefined && { cufdEvent }),
        ...(sectorDocumentId !== undefined && { sectorDocumentId }),
      },
    });

    return updated;
  }

  async remove(id: number) {
    const event = await this.findById(id);
    await this.prisma.significantEvent.update({
      where: { id },
      data: { state: 0 },
    });
    return event;
  }

  async getActiveEvent(pointSaleId?: number) {
    const where: any = { state: 1 };
    if (pointSaleId) where.pointSaleId = pointSaleId;

    const event = await this.prisma.significantEvent.findFirst({
      where,
      include: {
        reasonEvent: true,
        contingencies: { include: { contingency: true } },
      },
      orderBy: { id: 'desc' },
    });
    return event ?? null;
  }

  async findOrCreateActiveEvent(dto: {
    reasonEventId: number;
    branchOfficeId: number;
    pointSaleId: number;
    sectorDocumentId?: number;
    nowDate?: Date;
    cufdEvent?: string;
  }) {
    const { reasonEventId, branchOfficeId, pointSaleId, sectorDocumentId, nowDate, cufdEvent } = dto;

    const existing = await this.prisma.significantEvent.findFirst({
      where: { state: 1, pointSaleId, reasonEventId },
      include: { reasonEvent: true },
    });
    if (existing) return existing;

    const reasonEvent = await this.prisma.reasonEvent.findUnique({ where: { id: reasonEventId } });
    if (!reasonEvent) throw new BadRequestException('reasonEventId no existe');

    const branchOffice = await this.prisma.branchOffice.findUnique({ where: { id: branchOfficeId } });
    if (!branchOffice) throw new BadRequestException('branchOfficeId no existe');

    const pointSale = await this.prisma.pointSale.findUnique({ where: { id: pointSaleId } });
    if (!pointSale) throw new BadRequestException('pointSaleId no existe');

    const maxNumberResult = await this.prisma.significantEvent.findMany({
      where: { pointSaleId },
      orderBy: { number: 'desc' },
      take: 1,
    });
    const maxNumber = maxNumberResult.length > 0 ? parseInt(maxNumberResult[0].number, 10) : 0;

    const now = new Date();
    const eventEnd = new Date(now);
    eventEnd.setHours(eventEnd.getHours() + 72);

    return this.prisma.significantEvent.create({
      data: {
        number: String(maxNumber + 1),
        code: null,
        startDate: nowDate,
        endDate: null,
        transaction: false,
        transactionReceipt: null,
        transactionValidation: null,
        cufdEvent: cufdEvent ?? null,
        cufd: null,
        reasonEventCode: reasonEvent.classifierCode,
        branchOfficeCode: String(branchOffice.code),
        pointSaleCode: String(pointSale.pointSaleCode),
        reasonEventId,
        branchOfficeId,
        pointSaleId,
        sectorDocumentId: sectorDocumentId ?? null,
      },
      include: { reasonEvent: true },
    });
  }

  async getReasonEvents() {
    return this.prisma.reasonEvent.findMany({
      where: { 
        state: 1,
        classifierCode: {in: ['5', '6', '7']}, 
      },
      orderBy: { id: 'asc' },
    });
  }

  async getContingencies() {
    return this.prisma.contingency.findMany({
      where: { state: 1 },
      orderBy: { id: 'asc' },
    });
  }

  async getAvailableInvoices() {
    return this.prisma.invoice.findMany({
      where: { state: 'V' },
      orderBy: { id: 'desc' },
      take: 500,
    });
  }

  async linkInvoices(id: number, invoiceIds: number[]) {
    const event = await this.findById(id);
    if (!invoiceIds || invoiceIds.length === 0) {
      throw new BadRequestException('invoiceIds es requerido');
    }

    const existingInvoices = await this.prisma.invoice.findMany({
      where: { id: { in: invoiceIds } },
    });
    if (existingInvoices.length !== invoiceIds.length) {
      throw new BadRequestException('Una o más facturas no existen');
    }

    const results = await this.prisma.$transaction(
      invoiceIds.map((invoiceId) =>
        this.prisma.significantEventInvoice.upsert({
          where: { significantEventId_invoiceId: { significantEventId: id, invoiceId } },
          update: {},
          create: { significantEventId: id, invoiceId },
        }),
      ),
    );

    return { linked: results.length };
  }

  async unlinkInvoices(id: number, invoiceIds: number[]) {
    const event = await this.findById(id);
    if (!invoiceIds || invoiceIds.length === 0) {
      throw new BadRequestException('invoiceIds es requerido');
    }

    await this.prisma.significantEventInvoice.deleteMany({
      where: {
        significantEventId: id,
        invoiceId: { in: invoiceIds },
      },
    });

    return { unlinked: invoiceIds.length };
  }

  async sendInvoiceSignificantEvent(id: number) {
    const event = await this.findById(id);
    const { reasonEventCode, branchOfficeCode, pointSaleCode, code: eventCode } = event;

    const cuisRec = await this.prisma.cuis.findFirst({
      where: { state: 1, branchOfficeId: event.branchOfficeId, pointSaleId: event.pointSaleId },
    });

    const currentCufdRec = await this.prisma.cufd.findFirst({
      where: { state: 1, branchOfficeId: event.branchOfficeId, pointSaleId: event.pointSaleId },
      orderBy: { id: 'desc' },
    });

    // 1. Registrar evento significativo si no está registrado
    if (!event.transaction || !eventCode) {
      const lastInvoiceLink = await this.prisma.significantEventInvoice.findFirst({
        where: { significantEventId: id },
        orderBy: { invoiceId: 'desc' },
      });
      if (!lastInvoiceLink) {
        throw new BadRequestException('No hay facturas vinculadas al evento');
      }

      const lastInvoice = await this.prisma.invoice.findUnique({ where: { id: lastInvoiceLink.invoiceId } });
      if (!lastInvoice) throw new BadRequestException('Factura no encontrada');

      const motivoEvento = Number(reasonEventCode) || 1;

      const fmtSiatDate = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.461`;
      };

      const fechaInicio = event.startDate instanceof Date ? fmtSiatDate(event.startDate) : fmtSiatDate(new Date(event.startDate));
      const eventEnd = event.endDate instanceof Date ? event.endDate : event.endDate ? new Date(event.endDate) : new Date();
      const fechaFin = fmtSiatDate(eventEnd);

      console.log('[EVENTO-SIAT] fechaInicio:', fechaInicio, 'fechaFin:', fechaFin, 'cuis:', cuisRec?.code, 'motivo:', motivoEvento, 'cufd:', event.cufdEvent);

      if (!currentCufdRec?.code) {
        throw new BadRequestException('Cufd caducado. Solicitar nuevo CUFD');
      }
      if (currentCufdRec.code === event.cufdEvent) {
        throw new BadRequestException('Solicitar Nuevo CUFD. El CUFD actual es el mismo usado al crear el evento');
      }

      const reasonEvent = await this.prisma.reasonEvent.findFirst({
        where: { classifierCode: String(motivoEvento) },
      });

      const result = await this.siatEmision.registroEventoSignificativo({
        codigoMotivoEvento: motivoEvento,
        cuis: cuisRec?.code ?? '0',
        cufd: currentCufdRec.code,
        cufdEvento: event.cufdEvent ?? '',
        descripcion: reasonEvent?.description ?? `Evento Significativo #${event.number}`,
        fechaHoraInicioEvento: fechaInicio,
        fechaHoraFinEvento: fechaFin,
        codigoPuntoVenta: Number(pointSaleCode) || undefined,
        codigoSucursal: Number(branchOfficeCode) || undefined,
      });

      if (!result.transaccion) {
        throw new BadRequestException(`Error al registrar evento significativo con SIAT: ${JSON.stringify(result)}`);
      }

      await this.prisma.significantEvent.update({
        where: { id },
        data: {
          code: result.codigoRecepcionEventoSignificativo,
          transaction: true,
        },
      });

      event.code = result.codigoRecepcionEventoSignificativo ?? null;
      event.transaction = true;
    }

    // 2. Enviar facturas en lotes de 500
    let totalSincronizadas = 0;
    const codigosEnvio: number[] = [];
    let hayPendientes = true;

    while (hayPendientes) {
      const links = await this.prisma.significantEventInvoice.findMany({
        where: {
          significantEventId: id,
          synchronizedSiat: SYNC_NO,
        },
        orderBy: { invoiceId: 'asc' },
        take: 500,
      });

      if (links.length === 0) {
        hayPendientes = false;
        break;
      }

      const invoiceIds = links.map((l) => l.invoiceId);
      const invoices = await this.prisma.invoice.findMany({
        where: { id: { in: invoiceIds } },
        orderBy: { id: 'asc' },
      });

      // Obtener XMLs de las facturas
      const xmls: string[] = [];
      for (const inv of invoices) {
        if (inv.urlXml) {
          try {
            const { readFileSync } = await import('fs');
            const { join } = await import('path');
            const xmlPath = join(process.cwd(), 'public', inv.urlXml);
            console.error(`[SFE] Reading XML from: ${xmlPath}`);
            const xmlContent = readFileSync(xmlPath, 'utf-8');
            console.error(`[SFE] XML content length: ${xmlContent.length}, has detalle: ${xmlContent.includes('<detalle>')}`);
            xmls.push(xmlContent);
          } catch (err) {
            console.error(`[SFE] FAILED to read XML for invoice ${inv.id}: ${err}`);
            xmls.push(`<factura id="${inv.id}"/>`);
          }
        }
      }

      if (xmls.length === 0) {
        hayPendientes = false;
        break;
      }

      // Empaquetar y enviar
      const paquete = this.siatEmision.prepararPaqueteFacturas(xmls);
      const sectorCode = invoices.length > 0 ? (Number(invoices[0].sectorDocumentCode) || SECTOR_COMPRA_VENTA) : SECTOR_COMPRA_VENTA;
      const tipoFactura = DOCUMENT_SECTORS_TYPE_INVOICES[sectorCode] ?? 1;

      const fmtSiatNow = () => {
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.461`;
      };

      const fechaEnvio = fmtSiatNow();

      const receptionResult = await this.siatEmision.recepcionPaqueteFactura({
        archivo: paquete.archivo,
        fechaEnvio,
        hashArchivo: paquete.hashArchivo,
        cufd: currentCufdRec?.code ?? '',
        cuis: cuisRec?.code ?? '0',
        codigoDocumentoSector: sectorCode,
        codigoEmision: EMISSION_OFFLINE,
        tipoFacturaDocumento: tipoFactura,
        cafc: null,
        cantidadFacturas: paquete.cantidadFacturas,
        codigoEvento: event.code ?? '',
      });

      if (!receptionResult.transaccion) {
        console.error('[SFE] recepcionPaqueteFactura FAILED:', JSON.stringify(receptionResult, null, 2));
        throw new BadRequestException(`Error en recepción de paquete: ${receptionResult.codigoDescripcion ?? 'Error desconocido'} | errores: ${JSON.stringify(receptionResult.errores)}`);
      }

      // 3. Guardar InvoicePackageReception
      const maxNumberResult = await this.prisma.invoicePackageReception.findMany({
        where: { significantEventId: id },
        orderBy: { number: 'desc' },
        take: 1,
      });
      const maxNumber = maxNumberResult.length > 0 ? maxNumberResult[0].number : 0;

      const packageReception = await this.prisma.invoicePackageReception.create({
        data: {
          number: maxNumber + 1,
          descriptionCode: receptionResult.codigoDescripcion ?? null,
          stateCode: String(receptionResult.codigoEstado ?? ''),
          receptionCode: receptionResult.codigoRecepcion ?? null,
          transaction: true,
          amount: xmls.length,
          significantEventId: id,
        },
      });

      // 4. Validar recepción del paquete
      const validationResult = await this.siatEmision.validacionRecepcionPaqueteFactura({
        cufd: currentCufdRec?.code ?? '',
        cuis: cuisRec?.code ?? '0',
        codigoDocumentoSector: sectorCode,
        codigoEmision: EMISSION_OFFLINE,
        tipoFacturaDocumento: tipoFactura,
        codigoRecepcion: receptionResult.codigoRecepcion ?? '',
      });

      if (validationResult.transaccion) {
        await this.prisma.validationInvoicePackageReception.create({
          data: {
            descriptionCode: validationResult.codigoDescripcion ?? null,
            stateCode: String(validationResult.codigoEstado ?? ''),
            receptionCode: validationResult.codigoRecepcion ?? null,
            transaction: true,
            significantEventId: id,
            receiptPackageInvoiceId: packageReception.id,
          },
        });
      }

      // 5. Marcar facturas como sincronizadas
      await this.prisma.invoice.updateMany({
        where: { id: { in: invoiceIds } },
        data: { synchronizedSiat: SYNC_YES },
      });

      await this.prisma.significantEventInvoice.updateMany({
        where: { id: { in: links.map((l) => l.id) } },
        data: { synchronizedSiat: SYNC_YES },
      });

      totalSincronizadas += links.length;
      codigosEnvio.push(...invoiceIds);
    }

    return {
      transaccion: true,
      mensaje: totalSincronizadas > 0
        ? `${totalSincronizadas} facturas sincronizadas`
        : 'No hay facturas pendientes de sincronización',
      codigos: codigosEnvio,
    };
  }
}

interface CreateSignificantEventDto {
  reasonEventId: number;
  startDate: string;
  endDate: string;
  cufdEvent?: string;
  branchOfficeId: number;
  pointSaleId: number;
  sectorDocumentId?: number;
  contingencyId?: number;
}

interface UpdateSignificantEventDto {
  startDate?: string;
  endDate?: string;
  cufdEvent?: string;
  sectorDocumentId?: number;
}
