import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';
import { DOCUMENT_SECTORS_CODES_TYPE_INVOICES } from '../../common/siat.constants';

/** Mapa recurso (ruta) -> delegate de Prisma. */
export const CATALOG_RESOURCES: Record<string, string> = {
  sector_document: 'sectorDocument',
  activity: 'activity',
  legend: 'legend',
  unit_measure: 'unitMeasure',
  identity_document_type: 'identityDocumentType',
  payment_method_type: 'paymentMethodType',
  currency: 'currency',
  reason_cancellation: 'reasonCancellation',
  reason_event: 'reasonEvent',
  type_invoice_document: 'typeInvoiceDocument',
  products_services: 'productsServices',
  sector_document_activity: 'sectorDocumentActivity',
  cuis: 'cuis',
  cufd: 'cufd',
  point_sale: 'pointSale',
  point_sale_type: 'pointSaleType',
  group: 'group',
  product_type: 'productType',
  product_model: 'productModel',
  city: 'city',
  significant_event: 'significantEvent',
};

@Controller('catalog')
@CheckAbility({ action: Action.Read, subject: 'Catalog' })
export class CatalogSiatController {
  constructor(private readonly prisma: PrismaService) {}

  private delegate(resource: string): any {
    const model = CATALOG_RESOURCES[resource];
    if (!model) {
      throw new NotFoundException(`Recurso de catálogo SIAT no soportado: ${resource}`);
    }
    return (this.prisma as any)[model];
  }

  @Get('catalog')
  listAvailable() {    
    return Object.keys(CATALOG_RESOURCES);
  }

  @Get('sector_document')
  sectorDocument() {
    return this.delegate('sector_document').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('sector_document/get_list_enabled')
  sectorDocumentEnabled() {
    return this.delegate('sector_document').findMany({ where: { state: 1 } });
  }

  @Get('activity')
  activity() {
    return this.delegate('activity').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('activity/get_list_enabled')
  activityEnabled() {
    return this.delegate('activity').findMany({ where: { state: 1 } });
  }

  @Get('legend')
  legend() {
    return this.delegate('legend').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('legend/get_list_enabled')
  legendEnabled() {
    return this.delegate('legend').findMany({ where: { state: 1 } });
  }

  @Get('unit_measure')
  unitMeasure() {
    return this.delegate('unit_measure').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('unit_measure/get_list_enabled')
  unitMeasureEnabled() {
    return this.delegate('unit_measure').findMany({ where: { state: 1 } });
  }

  @Get('identity_document_type')
  identityDocumentType() {
    return this.delegate('identity_document_type').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('identity_document_type/get_list_enabled')
  identityDocumentTypeEnabled() {
    return this.delegate('identity_document_type').findMany({ where: { state: 1 } });
  }

  @Get('payment_method_type')
  paymentMethodType() {
    return this.delegate('payment_method_type').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('payment_method_type/get_list_enabled')
  paymentMethodTypeEnabled() {
    return this.delegate('payment_method_type').findMany({ where: { state: 1 } });
  }

  @Get('currency')
  currency() {
    return this.delegate('currency').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('currency/get_list_enabled')
  currencyEnabled() {
    return this.delegate('currency').findMany({ where: { state: 1 } });
  }

  @Get('reason_cancellation')
  reasonCancellation() {
    return this.delegate('reason_cancellation').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('reason_cancellation/get_list_enabled')
  reasonCancellationEnabled() {
    return this.delegate('reason_cancellation').findMany({ where: { state: 1 } });
  }

  @Get('type_invoice_document')
  typeInvoiceDocument() {
    return this.delegate('type_invoice_document').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('type_invoice_document/get_list_enabled')
  typeInvoiceDocumentEnabled(@Query('sector_document_code') sectorDocumentCode?: string) {
    const where: any = { state: 1 };
    if (sectorDocumentCode && DOCUMENT_SECTORS_CODES_TYPE_INVOICES[sectorDocumentCode] !== undefined) {
      where.classifierCode = String(DOCUMENT_SECTORS_CODES_TYPE_INVOICES[sectorDocumentCode]);
    }
    return this.delegate('type_invoice_document').findMany({ where });
  }

  @Get('products_services')
  productsServices() {
    return this.delegate('products_services').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('products_services/get_list_enabled')
  productsServicesEnabled() {
    return this.delegate('products_services').findMany({ where: { state: 1 } });
  }

  @Get('sector_document_activity')
  sectorDocumentActivity() {
    return this.delegate('sector_document_activity').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('sector_document_activity/get_list_enabled')
  sectorDocumentActivityEnabled() {
    return this.delegate('sector_document_activity').findMany({ where: { state: 1 } });
  }

  @Get('reason_event')
  reasonEvent() {
    return this.delegate('reason_event').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('reason_event/get_list_enabled')
  reasonEventEnabled() {
    return this.delegate('reason_event').findMany({ where: { state: 1, classifierCode: {in: ['1', '2', '3', '4']}, },orderBy: { classifierCode: 'asc' } });
  }

  @Get('significant_event')
  significantEvent() {
    return this.delegate('significant_event').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('significant_event/get_list_enabled')
  significantEventEnabled() {
    return this.delegate('significant_event').findMany({ where: { state: 1 } });
  }

  @Get('cuis')
  cuis() {
    return this.delegate('cuis').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('cuis/get_list_enabled')
  cuisEnabled() {
    return this.delegate('cuis').findMany({ where: { state: 1 } });
  }

  @Get('cufd')
  cufd() {
    return this.delegate('cufd').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('cufd/get_list_enabled')
  cufdEnabled() {
    return this.delegate('cufd').findMany({ where: { state: 1 } });
  }

  @Get('point_sale')
  pointSale() {
    return this.delegate('point_sale').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('point_sale/get_list_enabled')
  pointSaleEnabled() {
    return this.delegate('point_sale').findMany({ where: { state: 1 } });
  }

  @Get('point_sale_type')
  pointSaleType() {
    return this.delegate('point_sale_type').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('point_sale_type/get_list_enabled')
  pointSaleTypeEnabled() {
    return this.delegate('point_sale_type').findMany({ where: { state: 1 } });
  }

  @Get('city')
  city() {
    return this.delegate('city').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('city/get_list_enabled')
  cityEnabled() {
    return this.delegate('city').findMany({ where: { state: 1 } });
  }

  @Get('group')
  group() {
    return this.delegate('group').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('group/get_list_enabled')
  groupEnabled() {
    return this.delegate('group').findMany({ where: { state: 1 } });
  }

  @Get('product_type')
  productType() {
    return this.delegate('product_type').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('product_type/get_list_enabled')
  productTypeEnabled() {
    return this.delegate('product_type').findMany({ where: { state: 1 } });
  }

  @Get('product_model')
  productModel() {
    return this.delegate('product_model').findMany({ orderBy: { id: 'asc' } });
  }

  @Get('product_model/get_list_enabled')
  productModelEnabled() {
    return this.delegate('product_model').findMany({ where: { state: 1 } });
  }

  @Get(':resource')
  catchAll(@Param('resource') resource: string) {
    return this.delegate(resource).findMany({ orderBy: { id: 'asc' } });
  }
}