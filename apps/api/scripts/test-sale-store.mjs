import fs from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist-build/app.module.js';

const LOG_PATH = path.resolve('apps/api/scripts/test-sale-store.log');
const logLines = [];
function log(msg) {
  logLines.push(String(msg));
}
function flushLog(exitCode = 0) {
  try { fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true }); } catch {}
  fs.writeFileSync(LOG_PATH, logLines.join('\n') + '\n', 'utf-8');
  process.exit(exitCode);
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

const mockUser = {
  id: 1,
  username: 'admin',
  email: 'admin@sfe.local',
  isActive: true,
  createdAt: new Date(),
  userRoles: [{
    role: {
      id: 1,
      name: 'SUPER_ADMIN',
      description: 'Super admin',
      isActive: true,
      rolePermissions: [
        { permission: { id: 1, name: 'system.full_access' } }
      ]
    }
  }],
  userPermissions: []
};

async function main() {
  log('=== test-sale-store @ ' + new Date().toISOString());
  log('Iniciando Nest ApplicationContext...');
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    log('ApplicationContext creado. Obteniendo SaleService...');
    const saleService = app.get('SaleService');
    log('SaleService obtenido. Ejecutando store()...');
    try {
      const result = await saleService.store(mockUser, payload);
      log('RESULTADO OK (HTTP 200):');
      log('status=success');
      log('sale_id=' + (result.sale?.id));
      log('invoice_id=' + (result.invoice?.id));
      log('invoice_num=' + (result.invoice?.invoiceNum));
      const ir = result.invoice_result;
      if (typeof ir === 'string') {
        log('invoice_result_str=' + ir);
      } else {
        log('invoice_result_keys=' + Object.keys(ir ?? {}).join(','));
        log('codigoRecepcion=' + (ir?.codigoRecepcion ?? ir?.codigo_recepcion ?? 'N/A'));
        log('transaccion=' + (ir?.transaccion ?? 'N/A'));
      }
      flushLog(0);
    } catch (err) {
      log('RESULTADO EXCEPTION (store() throw):');
      log('  constructor=' + (err.constructor?.name ?? 'N/A'));
      log('  status=' + (err.status ?? err.statusCode ?? 'N/A'));
      log('  message=' + (err.message ?? 'N/A'));
      if (err.code) log('  prisma_code=' + err.code);
      if (err.response) {
        try { log('  response=' + JSON.stringify(err.response)); } catch {}
      }
      log('----STACK----');
      log(err.stack || '(no stack)');
      flushLog(1);
    }
  } catch (e) {
    log('FATAL init error: ' + (e?.message ?? e));
    log(e?.stack ?? '(no stack)');
    flushLog(2);
  }
}

main();
