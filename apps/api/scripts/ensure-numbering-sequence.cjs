const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');

const logPath = path.join(__dirname, 'prisma-push.log');
const log = (m) => { const line = `[${new Date().toISOString()}] ${m}\n`; console.log(line.trim()); try { fs.appendFileSync(logPath, line, 'utf8'); } catch (e) { console.error('LOG FAIL', e.message); } };

(async () => {
  log('START: verificando tables existentes en la DB...');

  // 1) Verificar tabla numbering_sequence vía raw query (SQLite)
  try {
    const rows = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name='numbering_sequence';`);
    log('Existe numbering_sequence (antes): ' + JSON.stringify(rows));
  } catch (e) {
    log('ERROR raw check: ' + e.message);
  }

  // 2) Intentar crear tabla numbering_sequence manualmente si no existe (SQLite-compatible)
  try {
    const createSQL = `
      CREATE TABLE IF NOT EXISTS "numbering_sequence" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "counter_type" TEXT NOT NULL,
        "branch_office_id" INTEGER NOT NULL,
        "point_sale_id" INTEGER,
        "current" INTEGER NOT NULL DEFAULT 0,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("branch_office_id") REFERENCES "branch_office"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("point_sale_id") REFERENCES "point_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `;
    await prisma.$executeRawUnsafe(createSQL);
    log('CREATE TABLE numbering_sequence OK (IF NOT EXISTS).');
  } catch (e) {
    log('ERROR creando tabla (quizá ya existe via otro proceso): ' + e.message + ' | STACK: ' + e.stack?.slice(0, 300));
  }

  // 3) Unique index + regular index
  try {
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "numbering_sequence_counter_type_branch_office_id_point_sale_id_key" ON "numbering_sequence"("counter_type", "branch_office_id", "point_sale_id");`);
      log('CREATE UNIQUE INDEX OK.');
    } catch (e) { log('WARN unique idx: ' + e.message); }

    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "numbering_sequence_branch_office_id_point_sale_id_idx" ON "numbering_sequence"("branch_office_id", "point_sale_id");`);
      log('CREATE INDEX (branch, point_sale) OK.');
    } catch (e) { log('WARN idx: ' + e.message); }
  } catch (e) { log('ERROR indices: ' + e.message); }

  // 4) Verificar de nuevo
  try {
    const rows = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name='numbering_sequence';`);
    log('Existe numbering_sequence (después): ' + JSON.stringify(rows));
    if (Array.isArray(rows) && rows.length > 0) {
      const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info("numbering_sequence");`);
      log('Columnas numbering_sequence: ' + JSON.stringify(cols, null, 2));
    }
  } catch (e) {
    log('ERROR post-check: ' + e.message + ' | ' + e.stack?.slice(0, 300));
  }

  log('DONE.');
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => {
  log('FATAL: ' + e.message + ' | ' + e.stack);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
