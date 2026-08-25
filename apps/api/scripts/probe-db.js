const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const inv = await p.invoice.findUnique({ where: { id: 4 } });
  console.log('INVOICE:', JSON.stringify(inv, null, 2));
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});