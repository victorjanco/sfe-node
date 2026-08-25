const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const envPath = path.join(__dirname, '..', '.env');
const envText = fs.readFileSync(envPath, 'utf8');
const tokenMatch = envText.match(/^SIAT_TOKEN="?([^"\r\n]+)"?/m);
const token = tokenMatch ? tokenMatch[1] : '';

const p = new PrismaClient();
(async () => {
  const c = await p.company.updateMany({
    where: { state: 1 },
    data: { nit: '2947679018', systemCode: '7755FB9029E483B79F80E2F', modalityCode: 1, environmentCode: 2, nameCompany: 'MORENO PEREZ HUMBERTO' },
  });
  const b = await p.branchOffice.updateMany({
    where: { state: 1 },
    data: { nit: '2947679018' },
  });
  const t = await p.token.updateMany({ where: { state: 1 }, data: { value: token } });
  const cuis = await p.cuis.updateMany({ where: { state: 1 }, data: { state: 2 } });
  const cufd = await p.cufd.updateMany({ where: { state: 1 }, data: { state: 2, state2: 2, state3: 2 } });
  console.log('company:', c.count, '| branch:', b.count, '| token:', t.count, '| cuis inval.:', cuis.count, '| cufd inval.:', cufd.count);
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});