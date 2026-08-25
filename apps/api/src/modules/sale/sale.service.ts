import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { procesoCuf } from '@sfe/core';
import { PrismaService } from '../../prisma/prisma.service';
import { SiatEmisionClient } from './siat-emision.client';
import { buildFacturaXml } from './factura-xml';
import { SaleDetailDto, SaleStoreDto } from './dto/sale.dto';
import { SaleQueryDto } from './dto/sale-query.dto';
import { InventoryService } from '../inventory/inventory.service';
import {
  EMISSION_ONLINE,
  EXCEPTION_NITS,
  IVA_RATE,
  NO_CONTINGENCY,
  SECTOR_COMPRA_VENTA,
  SYNC_NO,
  SYNC_YES,
  INVOICE_STATE_VALID,
  DOCUMENT_SECTORS_TYPE_INVOICES,
  DOCUMENT_SECTORS_NAME_XML,
  MODALITY_NAME_XML,
} from '../../common/siat.constants';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

const TX_OPTS: {
  maxWait?: number;
  timeout?: number;
  isolationLevel: Prisma.TransactionIsolationLevel;
} = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 15000,
  timeout: 60000,
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function padStart(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

function toNum(v: number | string | undefined, fallback = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function dateTimeFormat(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

@Injectable()
export class SaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siatEmisionClient: SiatEmisionClient,
    private readonly inventoryService: InventoryService,
  ) {}

  async getTypeMoneySale() {
    const company = await this.prisma.company.findFirst({ where: { state: 1 } });
    const branchOffices = await this.prisma.branchOffice.findMany({ where: { state: 1 } });
    const pointSales = await this.prisma.pointSale.findMany({ where: { state: 1 } });
    return {
      DECIMAL_PRODUCT: 4,
      DECIMAL_PRICE: 2,
      DECIMAL_AMOUNT: 2,
      DECIMAL_DISCOUNT: 2,
      TYPE_PRINT: company?.typePrint ?? 1,
      TYPE_MONEY_SALE: 'Bs',
      branch_offices: branchOffices,
      point_sales: pointSales,
    };
  }

  private buildWhereFromQuery(q: SaleQueryDto): Prisma.SaleWhereInput {
    const where: Prisma.SaleWhereInput = {};
    if (q.date_from || q.date_to) {
      const saleDate: Prisma.DateTimeFilter = {};
      if (q.date_from) {
        const from = new Date(q.date_from);
        from.setHours(0, 0, 0, 0);
        saleDate.gte = from;
      }
      if (q.date_to) {
        const to = new Date(q.date_to);
        to.setHours(23, 59, 59, 999);
        saleDate.lte = to;
      }
      where.saleDate = saleDate;
    }
    if (q.branch_office_id) where.branchOfficeId = Number(q.branch_office_id);
    if (q.sale_type) where.saleType = q.sale_type;
    if (q.state) where.state = Number(q.state);
    return where;
  }

  async index(q: SaleQueryDto = {}) {
    const where = this.buildWhereFromQuery(q);
    const take = q.take ? Math.min(Number(q.take), 1000) : 100;
    const skip = q.skip ? Number(q.skip) : 0;

    const [items, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          saleDetails: true,
          customer: true,
          branchOffice: true,
          invoiceSales: { include: { invoice: true } },
        },
        orderBy: { id: 'desc' },
        take,
        skip,
      }),
      this.prisma.sale.count({ where }),
    ]);

    const subtotals = await this.prisma.sale.aggregate({
      where,
      _sum: { total: true, subtotal: true, discount: true },
      _count: { id: true },
    });

    return {
      items,
      total,
      summary: {
        count: subtotals._count.id,
        total: subtotals._sum.total ?? 0,
        subtotal: subtotals._sum.subtotal ?? 0,
        discount: subtotals._sum.discount ?? 0,
      },
    };
  }

  async exportExcel(q: SaleQueryDto = {}): Promise<Buffer> {
    const where = this.buildWhereFromQuery(q);
    const rows = await this.prisma.sale.findMany({
      where,
      include: {
        customer: true,
        branchOffice: true,
        invoiceSales: { include: { invoice: true } },
      },
      orderBy: { id: 'desc' },
      take: 10000,
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SFE Facturación';
    wb.created = new Date();

    const ws = wb.addWorksheet('Ventas');
    ws.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'N° Venta', key: 'saleNum', width: 12 },
      { header: 'N° Factura', key: 'invoiceNum', width: 14 },
      { header: 'Fecha', key: 'saleDate', width: 20 },
      { header: 'Tipo', key: 'saleType', width: 14 },
      { header: 'Sucursal', key: 'branchOffice', width: 22 },
      { header: 'NIT Cliente', key: 'nit', width: 14 },
      { header: 'Cliente', key: 'customerName', width: 36 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'Descuento', key: 'discount', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'CUF', key: 'cuf', width: 40 },
      { header: 'Código Control', key: 'controlCode', width: 20 },
      { header: 'Estado', key: 'state', width: 10 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };

    for (const r of rows) {
      const invoice = r.invoiceSales?.[0]?.invoice;
      ws.addRow({
        id: r.id,
        saleNum: r.saleNum,
        invoiceNum: invoice?.invoiceNum ?? '',
        saleDate: r.saleDate ? new Date(r.saleDate).toLocaleString() : '',
        saleType: r.saleType,
        branchOffice: r.branchOffice?.name ?? '',
        nit: r.customer?.nit ?? '',
        customerName: r.customer?.invoiceName ?? '',
        subtotal: Number(r.subtotal),
        discount: Number(r.discount),
        total: Number(r.total),
        cuf: invoice?.cuf ?? '',
        controlCode: invoice?.controlCode ?? '',
        state: r.state === 1 ? 'Válida' : String(r.state),
      });
    }

    const totalsRow = ws.addRow({
      customerName: 'TOTAL',
      subtotal: { formula: `SUM(I2:I${rows.length + 1})` },
      discount: { formula: `SUM(J2:J${rows.length + 1})` },
      total: { formula: `SUM(K2:K${rows.length + 1})` },
    });
    totalsRow.font = { bold: true };
    totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };

    ws.views = [{ state: 'frozen', ySplit: 1 }];

    return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async notasVenta() {
    return this.prisma.sale.findMany({
      where: { saleType: 'NOTA VENTA' },
      include: {
        saleDetails: true,
        customer: true,
      },
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  private async resolveCustomer(
    tx: Tx,
    dto: SaleStoreDto,
    exceptionCode: number,
    defaultCityId: number,
  ) {
    if (exceptionCode === 0) {
      const nit = (dto.nit_customer ?? '').trim();
      const name = (dto.name_customer ?? '').trim();
      if (!nit && !name) {
        throw new BadRequestException('Consignar datos del cliente');
      }
      const existing = await tx.customer.findFirst({ where: { nit } });
      if (existing) return existing;
      const maxCode = (await tx.customer.aggregate({ _max: { code: true } }))._max.code ?? 0;
      return tx.customer.create({
        data: {
          code: maxCode + 1,
          nit,
          invoiceName: name || nit,
          name: name || null,
          identityDocumentTypeCode: dto.identity_document_type_code ?? null,
          identityDocumentTypeId: dto.identity_document_type_id ?? null,
          cityId: defaultCityId,
          email: dto.email_customer ?? null,
          synchronized: 0,
          state: 1,
        },
      });
    }

    const name = (dto.name_customer ?? '').trim();
    const nitIngresado = (dto.nit_customer ?? '').trim();
    const nit = nitIngresado || (EXCEPTION_NITS[exceptionCode] ?? '99001');
    const existing = await tx.customer.findFirst({ where: { nit } });
    if (existing) {
      if (name) existing.invoiceName = name;
      return existing;
    }
    const maxCode = (await tx.customer.aggregate({ _max: { code: true } }))._max.code ?? 0;
    return tx.customer.create({
      data: {
        code: maxCode + 1,
        nit,
        invoiceName: name || nit,
        name: name || null,
        identityDocumentTypeId: 2,
        cityId: defaultCityId,
        synchronized: 0,
        state: 1,
      },
    });
  }

  private resolvePaymentMethod(dto: SaleStoreDto): string {
    if (dto.check_gift_card) return '3';
    if (dto.check_tarjeta) return '2';
    if (dto.check_otros) return '4';
    return '1';
  }

  async store(dto: SaleStoreDto) {
    const total = round2(toNum(dto.total));
    if (!(total > 0)) throw new BadRequestException('Total debe ser Mayor a 0.00');

    const __dbg = (_hyp: string, _msg: string, _data?: unknown) => {};

    const txPromise = this.prisma.$transaction(async (tx) => {
      const company = await tx.company.findFirst({ where: { state: 1 } });
      if (!company) throw new NotFoundException('No existe empresa habilitada');

      let branchOfficeId = dto.branch_office_id;
      if (!branchOfficeId) {
        branchOfficeId = (await tx.branchOffice.findFirst({ where: { state: 1 } }))?.id;
      }
      const branchOffice = await tx.branchOffice.findUnique({ where: { id: branchOfficeId } });
      if (!branchOffice) throw new NotFoundException('Sucursal no encontrada');

      const pointSale = await tx.pointSale.findFirst({
        where: { branchOfficeId: branchOffice.id, state: 1 },
      });
      if (!pointSale) throw new NotFoundException('Punto de venta no encontrado');

      const cuis = await tx.cuis.findFirst({
        where: { pointSaleId: pointSale.id, branchOfficeId: branchOffice.id, state: 1 },
      });
      const cufd = await tx.cufd.findFirst({
        where: { pointSaleId: pointSale.id, branchOfficeId: branchOffice.id, state: 1 },
      });
      // #region debug-point B:cuis-cufd
      __dbg('B', 'CUIS/CUFD post-lookup', { cuisCode: cuis?.code, cuisState: cuis?.state, cufdCode: cufd?.code, cufdControl: cufd?.controlCode, branchOfficeId: branchOffice.id, pointSaleId: pointSale.id });
      // #endregion
      if (!cuis || !cufd) {
        throw new BadRequestException('CUIS/CUFD no disponibles. Solicitar al SIAT.');
      }

      const subtotal = round2(toNum(dto.subtotal, total));
      const discount = round2(toNum(dto.discount));
      const taxCreditBase = round2(toNum(dto.tax_credit_base_amount, total));
      const totalToPay = round2(toNum(dto.total_to_pay, total));
      const giftCardAmount = round2(toNum(dto.gift_card_amount));
      const changeType = toNum(dto.change_type, 1) || 1;
      const iva = round2(taxCreditBase * IVA_RATE);

      const exceptionCode = Number(dto.exception_code ?? dto.type_exception ?? 0);
      const defaultCityId = (await tx.city.findFirst())?.id ?? 1;
      const customer = await this.resolveCustomer(tx, dto, exceptionCode, defaultCityId);

      // #region debug-point C:customer-and-sector-docs
      __dbg('C', 'Cliente resuelto + sector docs lookup PRE', { exceptionCode, exceptionNit: EXCEPTION_NITS[exceptionCode], nitIngresado: dto.nit_customer, customerId: customer?.id, customerNit: customer?.nit, customerInvoiceName: customer?.invoiceName, sectorDocumentId: dto.sector_document_id, docNameXml: DOCUMENT_SECTORS_NAME_XML[dto.sector_document_id ?? SECTOR_COMPRA_VENTA], typeInvDefaultForSector: DOCUMENT_SECTORS_TYPE_INVOICES[dto.sector_document_id ?? SECTOR_COMPRA_VENTA] });
      // #endregion

      const identityDocTypeId = dto.identity_document_type_id ?? customer.identityDocumentTypeId ?? 2;
      const identityDoc = await tx.identityDocumentType.findUnique({ where: { id: identityDocTypeId } });
      const identityDocCode = identityDoc?.classifierCode ?? '2';

      const sectorDocumentId = dto.sector_document_id ?? SECTOR_COMPRA_VENTA;
      const sectorDocument = await tx.sectorDocument.findUnique({ where: { id: sectorDocumentId } });

      // #region debug-point A:sector-document-id
      __dbg('A', 'sectorDocument post-DB result', { sectorDocumentId, sectorDocumentFound: !!sectorDocument, sectorDocumentClassifier: sectorDocument ? { id: sectorDocument.id, classifierCode: sectorDocument.classifierCode, name: (sectorDocument as any)?.name ?? sectorDocument } : null });
      // #endregion
      if (!sectorDocument) throw new NotFoundException('Documento de sector no encontrado');

      const activityId = dto.activity_id ?? (customer as any)._activityId ?? 1;
      const activity = await tx.activity.findUnique({ where: { id: activityId } });
      if (!activity) throw new NotFoundException('Actividad económica no encontrada');

      const typeInvoiceDocumentId =
        dto.type_invoice_document_id ?? DOCUMENT_SECTORS_TYPE_INVOICES[sectorDocumentId] ?? 1;
      const typeInvoiceDocument = await tx.typeInvoiceDocument.findUnique({
        where: { id: typeInvoiceDocumentId },
      });
      const typeInvoiceDocCode = typeInvoiceDocument?.classifierCode ?? '1';

      const paymentMethodTypeCode = this.resolvePaymentMethod(dto);

      const saleNum = await this.prisma.nextSaleNum(tx as any, branchOffice.id);
      const invoiceNum = await this.prisma.nextInvoiceNum(tx as any, branchOffice.id, pointSale.id);

      const saleDate = new Date();
      const invoiceDateFormatStr = dateTimeFormat(saleDate) + '.461';

      const legend =
        (await tx.legend.findFirst({ where: { state: 1, activityId: activity.id }, orderBy: { id: 'desc' } })) ??
        (await tx.legend.findFirst({ where: { state: 1 } }));
      if (!legend) throw new BadRequestException('No existe ninguna leyenda configurada');

      const currencyCode = dto.money === 'Sus' ? '2' : '1';
      const currency = await tx.currency.findFirst({ where: { classifierCode: currencyCode } });

      const cufResult = procesoCuf({
        nit_emisor: branchOffice.nit,
        fecha: invoiceDateFormatStr,
        sucursal: branchOffice.code,
        modalidad: company.modalityCode,
        tipo_emision: EMISSION_ONLINE,
        tipo_factura: typeInvoiceDocCode,
        documento_sector: sectorDocument.classifierCode,
        numero_factura_format: padStart(invoiceNum, 10),
        punto_venta: pointSale.pointSaleCode,
        codigoControl: cufd.controlCode,
      });

      const detailRows: Array<{
        detail: SaleDetailDto;
        product: any;
        productsService: any;
        unitMeasure: any;
        productCode: string;
        description: string;
      }> = [];
      for (const detail of dto.array_detalle ?? []) {
        const product = detail.product_id
          ? await tx.product.findUnique({ where: { id: detail.product_id } })
          : null;
        const productsService =
          (detail.products_services_id
            ? await tx.productsServices.findUnique({ where: { id: detail.products_services_id } })
            : null) ??
          (product?.productsServicesId
            ? await tx.productsServices.findUnique({ where: { id: product.productsServicesId } })
            : null) ??
          (await tx.productsServices.findFirst({ where: { state: 1 } }));
        if (!productsService) throw new NotFoundException('Producto/Servicio no encontrado');

        const unitMeasure =
          (detail.unit_measure_id
            ? await tx.unitMeasure.findUnique({ where: { id: detail.unit_measure_id } })
            : null) ??
          (product?.unitMeasureId
            ? await tx.unitMeasure.findUnique({ where: { id: product.unitMeasureId } })
            : null) ??
          (await tx.unitMeasure.findFirst({ where: { state: 1 } }));
        if (!unitMeasure) throw new NotFoundException('Unidad de medida no encontrada');

        const productCode = detail.product_code ?? product?.code ?? '0';
        const description = detail.description ?? detail.product_name ?? product?.tradename ?? '';
        if (!description) throw new BadRequestException('Detalle sin descripción');

        detailRows.push({ detail, product, productsService, unitMeasure, productCode, description });
      }
      if (detailRows.length === 0) {
        throw new BadRequestException('No se enviaron productos o servicios');
      }

      const warehouse = await this.inventoryService.resolveWarehouseForBranch(tx, branchOffice.id);
      const withdrawInventory = Number(dto.inventory ?? 1) === 1;
      const stockDetails = detailRows
        .filter((r) => r.product)
        .map((r) => ({ productId: r.product.id, quantity: toNum(r.detail.amount) }));
      if (withdrawInventory && warehouse && stockDetails.length) {
        await this.inventoryService.validateStockForSale(tx, stockDetails, warehouse.id);
      }

      // #region debug-point D:pre-build-xml
      __dbg('D', 'Datos justo antes de buildFacturaXml', { modalityCode: company.modalityCode, modalityName: MODALITY_NAME_XML[company.modalityCode], sectorDocumentId, sectorName: DOCUMENT_SECTORS_NAME_XML[sectorDocumentId], sectorClassifier: sectorDocument.classifierCode, typeInvoiceDocCode: typeInvoiceDocCode, exceptionCodeFinal: exceptionCode, finalCurrencyCode: currencyCode, cufOk: !!cufResult?.cuf, detalle_len: detailRows.length, activityCaeb: activity?.caebCode });
      // #endregion

      const xml = buildFacturaXml(
        company.modalityCode,
        sectorDocumentId,
        {
          nitEmisor: branchOffice.nit,
          razonSocialEmisor: company.nameCompany,
          municipio: branchOffice.cityTaxes,
          telefono: branchOffice.phone ?? null,
          numeroFactura: invoiceNum,
          cuf: cufResult.cuf,
          cufd: cufd.code,
          codigoSucursal: branchOffice.code,
          direccion: branchOffice.address,
          codigoPuntoVenta: pointSale.pointSaleCode,
          fechaEmision: invoiceDateFormatStr,
          nombreRazonSocial: customer.invoiceName,
          codigoTipoDocumentoIdentidad: identityDocCode,
          numeroDocumento: customer.nit,
          complemento: dto.complement ?? null,
          codigoCliente: customer.code,
          codigoMetodoPago: paymentMethodTypeCode,
          numeroTarjeta: dto.card_number ?? null,
          montoTotal: total,
          montoTotalSujetoIva: taxCreditBase,
          codigoMoneda: currencyCode,
          tipoCambio: changeType,
          montoTotalMoneda: total,
          montoGiftCard: giftCardAmount,
          descuentoAdicional: discount,
          codigoExcepcion: exceptionCode,
          cafc: null,
          leyenda: legend.legendDescription,
          usuario: 'USUARIO DEMO',
          codigoDocumentoSector: sectorDocument.classifierCode,
        },
        detailRows.map((r) => ({
          actividadEconomica: activity.caebCode,
          codigoProductoSin: r.productsService.productCode,
          codigoProducto: r.productCode,
          descripcion: r.description,
          cantidad: toNum(r.detail.amount),
          unidadMedida: r.unitMeasure.classifierCode,
          precioUnitario: toNum(r.detail.selling_price, r.product?.sellingPrice ?? 0),
          montoDescuento: toNum(r.detail.discount),
          subTotal: toNum(
            r.detail.subtotal,
            toNum(r.detail.amount) * toNum(r.detail.selling_price, r.product?.sellingPrice ?? 0),
          ),
          numeroSerie: r.detail.serial_number ?? null,
          numeroImei: r.detail.imei_number ?? null,
        })),
      );

      let preparado;
      try {
        preparado = await this.siatEmisionClient.prepararArchivo(xml);
      } catch (err) {
        throw new BadRequestException(
          `No se pudo preparar la factura para el SIAT: ${(err as Error).message}`,
        );
      }
      const { archivo, hashArchivo } = preparado;
      const urlXml = `facturas/${branchOffice.code}/en_linea/fc_${hashArchivo}.xml`;

      const comm = await this.siatEmisionClient.verificarComunicacion();
      if (!comm.transaccion) {
        throw new BadRequestException('No hay conexión con el SIAT');
      }
      const reception = await this.siatEmisionClient.recepcionFactura({
        archivo,
        hashArchivo,
        fechaEnvio: invoiceDateFormatStr,
        cufd: cufd.code,
        cuis: cuis.code,
        codigoDocumentoSector: Number(sectorDocument.classifierCode),
        codigoEmision: EMISSION_ONLINE,
        tipoFacturaDocumento: Number(typeInvoiceDocCode),
      });
      if (!reception.transaccion) {
        const errores = (reception.errores as Array<{ descripcion?: string }> | undefined)
          ?.map((e) => e.descripcion)
          .filter(Boolean)
          .join('; ');
        const detalle = [reception.codigoDescripcion, errores].filter(Boolean).join(' — ');
        throw new BadRequestException(
          `La factura fue rechazada por el SIAT` +
            (reception.codigoEstado != null ? ` (código ${reception.codigoEstado})` : '') +
            (detalle ? `: ${detalle}` : ''),
        );
      }

      const sale = await tx.sale.create({
        data: {
          saleNum,
          saleType: dto.sale_type ?? 'FACTURA',
          saleDate,
          subtotal,
          discount,
          total,
          synchronized: SYNC_YES,
          state: 1,
          customerId: customer.id,
          branchOfficeId: branchOffice.id,
          userId: 1,
        },
      });

      const saleDetails = detailRows.map((r) => ({
        description: r.description,
        amount: toNum(r.detail.amount),
        costPrice: toNum(r.detail.cost_price, r.product?.costPrice ?? 0),
        sellingPrice: toNum(r.detail.selling_price, r.product?.sellingPrice ?? 0),
        subtotal: toNum(r.detail.subtotal),
        discount: toNum(r.detail.discount),
        total: toNum(r.detail.total),
        activityCode: activity.caebCode,
        productCodeSin: r.productsService.productCode,
        productCode: r.productCode,
        unitMeasureClassifierCode: r.unitMeasure.classifierCode,
        serialNumber: r.detail.serial_number ?? null,
        imeiNumber: r.detail.imei_number ?? null,
        state: 1,
        saleId: sale.id,
        productId: r.product?.id ?? 0,
        productsServicesId: r.productsService.id,
        unitMeasureId: r.unitMeasure.id,
      }));
      await tx.saleDetail.createMany({ data: saleDetails });

      if (withdrawInventory && warehouse && stockDetails.length) {
        await this.inventoryService.withdrawForSale(tx, {
          warehouseId: warehouse.id,
          saleId: sale.id,
          reference: `VENTA #${saleNum}`,
          userId: 1,
          details: stockDetails,
        });
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNum,
          invoiceNumFormat: padStart(invoiceNum, 10),
          invoiceDate: saleDate,
          invoiceDateFormat: saleDate,
          activityNum: activity.caebCode,
          codeCustomer: String(customer.code),
          nitCustomer: customer.nit,
          customerName: customer.invoiceName,
          customerComplement: dto.complement ?? null,
          identityDocumentTypeCode: identityDocCode,
          typeInvoiceDocumentCode: typeInvoiceDocCode,
          sectorDocumentCode: sectorDocument.classifierCode,
          paymentMethodTypeCode,
          branchOfficeCode: String(branchOffice.code),
          pointSaleCode: String(pointSale.pointSaleCode),
          currencyCode,
          changeType,
          amountNotSubjectIva: 0,
          exemptOperation: 0,
          ceroRateSale: 0,
          subtotal,
          discount,
          total,
          giftCardAmount,
          totalToPay,
          taxCreditBaseAmount: taxCreditBase,
          iva,
          controlCode: cufd.controlCode,
          address: cufd.address,
          legendDescription: legend.legendDescription,
          cardNumber: dto.card_number ?? null,
          receptionCode: reception.codigoRecepcion,
          emissionType: EMISSION_ONLINE,
          synchronizedSiat: SYNC_YES,
          exceptionCode,
          contingency: NO_CONTINGENCY,
          cuis: cuis.code,
          cufd: cufd.code,
          cuf: cufResult.cuf,
          transaction: true,
          urlXml,
          state: INVOICE_STATE_VALID,
          userId: 1,
          customerId: customer.id,
          activityId: activity.id,
          identityDocumentTypeId: identityDocTypeId,
          typeInvoiceDocumentId,
          branchOfficeId: branchOffice.id,
          pointSaleId: pointSale.id,
          sectorDocumentId,
          paymentMethodTypeId: dto.payment_method_type_id ?? null,
          currencyId: currency?.id ?? null,
        },
      });

      const invoiceDetails = detailRows.map((r) => ({
        description: r.description,
        amount: toNum(r.detail.amount),
        costPrice: toNum(r.detail.cost_price, r.product?.costPrice ?? 0),
        sellingPrice: toNum(r.detail.selling_price, r.product?.sellingPrice ?? 0),
        subtotal: toNum(r.detail.subtotal),
        discount: toNum(r.detail.discount),
        total: toNum(r.detail.total),
        activityCode: activity.caebCode,
        productCodeSin: r.productsService.productCode,
        productCode: r.productCode,
        unitMeasureClassifierCode: r.unitMeasure.classifierCode,
        serialNumber: r.detail.serial_number ?? null,
        imeiNumber: r.detail.imei_number ?? null,
        state: 1,
        invoiceId: invoice.id,
        productId: r.product?.id ?? 0,
        productsServicesId: r.productsService.id,
        unitMeasureId: r.unitMeasure.id,
      }));
      await tx.invoiceDetail.createMany({ data: invoiceDetails });

      await tx.invoiceSale.create({ data: { invoiceId: invoice.id, saleId: sale.id } });

      return { invoice, invoice_result: reception };
    }, TX_OPTS);
    return txPromise;
  }

  async storeNote(dto: SaleStoreDto) {
    const total = round2(toNum(dto.total));
    if (!(total > 0)) throw new BadRequestException('Total debe ser Mayor a 0.00');

    return this.prisma.$transaction(async (tx) => {
      let branchOfficeId = dto.branch_office_id;
      if (!branchOfficeId) {
        branchOfficeId = (await tx.branchOffice.findFirst({ where: { state: 1 } }))?.id;
      }
      const branchOffice = await tx.branchOffice.findUnique({ where: { id: branchOfficeId } });
      if (!branchOffice) throw new NotFoundException('Sucursal no encontrada');

      const nit = (dto.nit_customer ?? '').trim();
      const name = (dto.name_customer ?? '').trim();
      const defaultCityId = (await tx.city.findFirst())?.id ?? 1;

      let customer: any;
      if (dto.customer_id) {
        customer = await tx.customer.findUnique({ where: { id: dto.customer_id } });
      } else if (nit) {
        customer = await tx.customer.findFirst({ where: { nit } });
      }
      if (!customer) {
        customer = await tx.customer.findFirst({
          where: { nit: nit || 'CONSUMIDOR FINAL' },
        });
        if (!customer) {
          const maxCode = (await tx.customer.aggregate({ _max: { code: true } }))._max.code ?? 0;
          customer = await tx.customer.create({
            data: {
              code: maxCode + 1,
              nit: nit || 'CONSUMIDOR FINAL',
              invoiceName: name || nit || 'CONSUMIDOR FINAL',
              name: name || null,
              cityId: defaultCityId,
              synchronized: SYNC_NO,
              state: 1,
            },
          });
        } else if (name) {
          customer.invoiceName = name;
        }
      }

      const saleNum = await this.prisma.nextSaleNum(tx as any, branchOffice.id);

      const subtotal = round2(toNum(dto.subtotal, total));
      const discount = round2(toNum(dto.discount));
      const saleDate = dto.sale_date ? new Date(dto.sale_date) : new Date();
      const paymentMethodTypeCode = this.resolvePaymentMethod(dto);

      const detailRows: Array<{
        detail: SaleDetailDto;
        product: any;
        productsService: any;
        unitMeasure: any;
        productCode: string;
        description: string;
      }> = [];
      for (const detail of dto.array_detalle ?? []) {
        const product = detail.product_id
          ? await tx.product.findUnique({ where: { id: detail.product_id } })
          : null;
        const productsService =
          (detail.products_services_id
            ? await tx.productsServices.findUnique({ where: { id: detail.products_services_id } })
            : null) ??
          (product?.productsServicesId
            ? await tx.productsServices.findUnique({ where: { id: product.productsServicesId } })
            : null) ??
          (await tx.productsServices.findFirst({ where: { state: 1 } }));
        const unitMeasure =
          (detail.unit_measure_id
            ? await tx.unitMeasure.findUnique({ where: { id: detail.unit_measure_id } })
            : null) ??
          (product?.unitMeasureId
            ? await tx.unitMeasure.findUnique({ where: { id: product.unitMeasureId } })
            : null) ??
          (await tx.unitMeasure.findFirst({ where: { state: 1 } }));

        const productCode = detail.product_code ?? product?.code ?? '0';
        const description = detail.description ?? detail.product_name ?? product?.tradename ?? '';
        if (!description) throw new BadRequestException('Detalle sin descripción');

        detailRows.push({ detail, product, productsService, unitMeasure, productCode, description });
      }
      if (detailRows.length === 0) {
        throw new BadRequestException('No se enviaron productos o servicios');
      }

      const activity = (await tx.activity.findFirst({ where: { state: 1 } })) ?? {
        caebCode: '0',
      };

      const sale = await tx.sale.create({
        data: {
          saleNum,
          saleType: 'NOTA VENTA',
          saleDate,
          subtotal,
          discount,
          total,
          synchronized: SYNC_NO,
          state: 1,
          customerId: customer.id,
          branchOfficeId: branchOffice.id,
          userId: 1,
        },
      });

      const saleDetails = detailRows.map((r) => ({
        description: r.description,
        amount: toNum(r.detail.amount),
        costPrice: toNum(r.detail.cost_price, r.product?.costPrice ?? 0),
        sellingPrice: toNum(r.detail.selling_price, r.product?.sellingPrice ?? 0),
        subtotal: toNum(r.detail.subtotal),
        discount: toNum(r.detail.discount),
        total: toNum(r.detail.total),
        activityCode: activity.caebCode ?? '0',
        productCodeSin: r.productsService?.productCode ?? '0',
        productCode: r.productCode,
        unitMeasureClassifierCode: r.unitMeasure?.classifierCode ?? '1',
        serialNumber: r.detail.serial_number ?? null,
        imeiNumber: r.detail.imei_number ?? null,
        state: 1,
        saleId: sale.id,
        productId: r.product?.id ?? 0,
        productsServicesId: r.productsService?.id ?? 1,
        unitMeasureId: r.unitMeasure?.id ?? 1,
      }));
      await tx.saleDetail.createMany({ data: saleDetails });

      const warehouse = await this.inventoryService.resolveWarehouseForBranch(tx, branchOffice.id);
      const withdrawInventory = Number(dto.inventory ?? 1) === 1;
      const stockDetails = detailRows
        .filter((r) => r.product)
        .map((r) => ({ productId: r.product.id, quantity: toNum(r.detail.amount) }));
      if (withdrawInventory && warehouse && stockDetails.length) {
        await this.inventoryService.validateStockForSale(tx, stockDetails, warehouse.id);
        await this.inventoryService.withdrawForSale(tx, {
          warehouseId: warehouse.id,
          saleId: sale.id,
          reference: `NOTA VENTA #${saleNum}`,
          userId: 1,
          details: stockDetails,
        });
      }

      return {
        sale,
        payment_method_type_code: paymentMethodTypeCode,
        message: 'Nota de venta registrada correctamente',
      };
    }, TX_OPTS);
  }
}