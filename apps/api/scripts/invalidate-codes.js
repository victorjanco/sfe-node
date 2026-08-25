const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const c = await p.cuis.updateMany({ where: { state: 1 }, data: { state: 2 } });
  const f = await p.cufd.updateMany({ where: { state: 1 }, data: { state: 2, state2: 2, state3: 2 } });
  console.log('cuis invalidados:', c.count, '| cufd invalidados:', f.count);
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});