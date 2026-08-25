import fs from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist-build/app.module.js';
import { SaleService } from '../dist-build/modules/sale/sale.service.js';

const OUT_FILE = path.resolve(process.cwd(), 'apps/api/scripts/_test-result.json');

const payload = {
  id: 0,
  invoice_num: 0,
  sale_type: 'FACTURA',
  subtotal: 120,
  discount: 0,
  total: 120,
  total_to_pay: 120,
  tax_credit_base_amount: 120,
  customer_id: 1,
  nit_customer: '1020304012',
  name_customer: 'JUAN PEREZ',
  email_customer: 'juan@demo.bo',
  complement: '',
  sale_date: '2026-08-23T08:52',
  change_type: 1,
  money: 'Bs',
  card_number: '',
  gift_card_amount: 0,
  check_efectivo: true,
  check_tarjeta: false,
  check_gift_card: false,
  check_otros: false,
  exception_code: 1,
  type_exception: '1',
  inventory: 0,
  array_detalle: [
    {
      id: 1,
      product_id: 1,
      product_code: 'SVC-001',
      product_name: 'SERVICIOS DE CONSULTORÍA EN TI EDITADO',
      description: 'SERVICIOS DE CONSULTORÍA EN TI EDITADO',
      cost_price: 60,
      selling_price: 120,
      amount: 1,
      discount: 0,
      subtotal: 120,
      products_services_id: 72,
      unit_measure_id: 28,
      unit_measure: 'UNIDAD (SERVICIOS)'
    }
  ],
  branch_office_id: 1,
  activity_id: 1,
  sector_document_id: 35,
  identity_document_type_id: 1,
  type_invoice_document_id: 2,
  reason_event_id: '0'
};

function writeResult(obj) {
  try {
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.error('WRITE ERROR:', e);
  }
}

async function main() {
  const start = Date.now();
  const result = {
    startedAt: new Date().toISOString(),
    cwd: process.cwd(),
  };
  try {
    const t0 = Date.now();
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });
    result.initMs = Date.now() - t0;

    const saleService = app.get(SaleService);

    const t1 = Date.now();
    try {
      const r = await saleService.store(payload);
      result.success = true;
      result.storeMs = Date.now() - t1;
      result.data = {
        hasInvoice: !!r.invoice,
        invoiceId: r.invoice?.id ?? null,
        invoiceNum: r.invoice?.invoiceNum ?? null,
        cuf: r.invoice?.cuf ?? null,
        receptionCode: r.invoice?.receptionCode ?? null,
        invoiceResultTransaccion: r.invoice_result?.transaccion ?? null,
      };
      writeResult(result);
      await app.close();
      process.exit(0);
    } catch (err) {
      result.success = false;
      result.storeMs = Date.now() - t1;
      result.error = {
        constructor: err?.constructor?.name ?? null,
        name: err?.name ?? null,
        message: err?.message ?? String(err),
        status: err?.status ?? err?.statusCode ?? null,
        prismaCode: err?.code ?? null,
        prismaMeta: err?.meta ?? null,
        response: err?.response ?? null,
        stack: err?.stack ? String(err.stack).split('\n').slice(0, 20) : null,
      };
      writeResult(result);
      await app.close();
      process.exit(1);
    }
  } catch (err) {
    result.fatal = true;
    result.error = {
      constructor: err?.constructor?.name ?? null,
      message: err?.message ?? String(err),
      stack: err?.stack ? String(err.stack).split('\n').slice(0, 20) : null,
    };
    writeResult(result);
    process.exit(2);
  }
}

main();
