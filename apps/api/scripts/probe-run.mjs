import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, 'probe-run.log');
const log = (m) => { try { fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${m}\n`, 'utf8'); } catch (e) { console.error('LOG FAIL', e); } };

try { fs.writeFileSync(LOG_PATH, '', 'utf8'); } catch {}

log('start probe-run.mjs');
log('cwd=' + process.cwd());
log('__dirname=' + __dirname);

const appModulePath = path.resolve(__dirname, '..', 'dist-build', 'app.module.js');
log('AppModule expected path=' + appModulePath);
log('exists AppModule? ' + fs.existsSync(appModulePath));

try {
  const { AppModule } = await import(appModulePath);
  log('AppModule imported: typeof=' + typeof AppModule);
} catch (e) {
  log('AppModule IMPORT FAIL: ' + e.message);
  log(e.stack);
  process.exit(1);
}

const saleServicePath = path.resolve(__dirname, '..', 'dist-build', 'modules', 'sale', 'sale.service.js');
log('SaleService expected path=' + saleServicePath);
log('exists SaleService? ' + fs.existsSync(saleServicePath));

try {
  const mod = await import(appModulePath);
  const { AppModule } = mod;
  const { NestFactory } = await import('@nestjs/core');
  log('NestFactory imported');
  const app = await NestFactory.createApplicationContext(AppModule);
  log('ApplicationContext created');

  const { SaleService } = await import(saleServicePath);
  log('SaleService constructor imported: typeof=' + typeof SaleService);

  const saleService = app.get(SaleService);
  log('SaleService resolved from DI: typeof store=' + typeof saleService.store);

  const payload = {
    id: 0, invoice_num: 0, sale_type: 'FACTURA', subtotal: 120, discount: 0, total: 120,
    total_to_pay: 120, tax_credit_base_amount: 120, customer_id: 1, nit_customer: '1020304012',
    name_customer: 'JUAN PEREZ', email_customer: 'juan@demo.bo', complement: '',
    sale_date: '2026-08-23T08:52', change_type: 1, money: 'Bs', card_number: '', gift_card_amount: 0,
    check_efectivo: true, check_tarjeta: false, check_gift_card: false, check_otros: false,
    exception_code: 1, type_exception: '1', inventory: 0,
    array_detalle: [{
      id: 1, product_id: 1, product_code: 'SVC-001',
      product_name: 'SERVICIOS DE CONSULTORÍA EN TI EDITADO',
      description: 'SERVICIOS DE CONSULTORÍA EN TI EDITADO',
      cost_price: 60, selling_price: 120, amount: 1, discount: 0, subtotal: 120,
      products_services_id: 72, unit_measure_id: 28, unit_measure: 'UNIDAD (SERVICIOS)'
    }],
    branch_office_id: 1, activity_id: 1, sector_document_id: 35,
    identity_document_type_id: 1, type_invoice_document_id: 2, reason_event_id: '0'
  };

  log('Calling store(payload)...');
  const t0 = Date.now();
  try {
    const res = await saleService.store(payload);
    log('store SUCCESS in ' + (Date.now() - t0) + 'ms');
    log('res keys=' + Object.keys(res ?? {}).join(','));
    if (res?.invoice) {
      log('invoice.id=' + res.invoice.id);
      log('invoice.invoiceNum=' + res.invoice.invoiceNum);
    }
    process.exit(0);
  } catch (err) {
    log('store ERROR in ' + (Date.now() - t0) + 'ms');
    log('  constructor=' + (err?.constructor?.name || 'UNKNOWN'));
    log('  name=' + (err?.name || ''));
    log('  message=' + (err?.message || ''));
    log('  status=' + (err?.status ?? err?.statusCode ?? 'N/A'));
    if (err?.code) log('  prisma.code=' + err.code);
    if (err?.meta) try { log('  prisma.meta=' + JSON.stringify(err.meta)); } catch {}
    if (err?.response) try { log('  response=' + JSON.stringify(err.response)); } catch {}
    log('---STACK---');
    log(err?.stack || '(no stack)');
    process.exit(1);
  }
} catch (e) {
  log('FATAL: ' + e.message);
  log(e?.stack || '(no stack)');
  process.exit(2);
}
