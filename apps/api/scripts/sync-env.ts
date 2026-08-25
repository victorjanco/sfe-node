const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const company = await p.company.update({
    where: { id: 1 },
    data: {
      nit: '2947679018',
      nameCompany: 'MORENO PEREZ HUMBERTO',
      systemCode: '7755FB9029E483B79F80E2F',
      environmentCode: 2,
      modalityCode: 1,
    },
  });
  console.log('Updated company:', company);
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
}).finally(async () => {
  await p.$disconnect();
});