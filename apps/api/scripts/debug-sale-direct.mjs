import fs from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist-build/app.module.js';
import { SaleService } from '../dist-build/modules/sale/sale.service.js';

const LOG_PATH = path.resolve('apps/api/scripts/debug-sale-direct.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_PATH, line + '\n', 'utf8'); } catch {}
}

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

async function main() {
  log('=== INICIO DEBUG SALE DIRECT ===');
  log('CWD: ' + process.cwd());

  try {
    log('Creando ApplicationContext...');
    const app = await NestFactory.createApplicationContext(AppModule);
    log('ApplicationContext OK.');

    log('Obteniendo SaleService (por clase)...');
    const saleService = app.get(SaleService);
    log('SaleService OK: ' + (typeof saleService.store));

    log('Ejecutando saleService.store(payload)...');
    const t0 = Date.now();
    try {
      const result = await saleService.store(payload);
      log('SUCCESS! (' + (Date.now() - t0) + 'ms)');
      log('Result keys: ' + Object.keys(result).join(','));
      if (result.invoice) {
        log('invoice.id=' + result.invoice.id);
        log('invoice.cuf=' + (result.invoice.cuf || ''));
      }
      process.exit(0);
    } catch (err) {
      log('ERROR CAUGHT! (' + (Date.now() - t0) + 'ms)');
      log('  constructor: ' + (err?.constructor?.name || 'UNKNOWN'));
      log('  name: ' + (err?.name || ''));
      log('  message: ' + (err?.message || ''));
      log('  status: ' + (err?.status ?? err?.statusCode ?? 'N/A'));
      if (err?.code) log('  prisma.code: ' + err.code);
      if (err?.meta) {
        try { log('  prisma.meta: ' + JSON.stringify(err.meta)); } catch {}
      }
      if (err?.response) {
        try { log('  response: ' + JSON.stringify(err.response)); } catch {}
      }
      log('--- STACK ---');
      log(err?.stack || '(no stack)');
      process.exit(1);
    }
  } catch (e) {
    log('FATAL INIT ERROR:');
    log('  message: ' + (e?.message || e));
    log(e?.stack || '(no stack)');
    process.exit(2);
  }
}

main();
