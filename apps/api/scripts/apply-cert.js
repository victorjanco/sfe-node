const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const keysDir = path.join(__dirname, '..', 'keys', 'humberto');
const privateKey = fs.readFileSync(path.join(keysDir, 'claveprivadakey.pem'), 'utf8').trim();

const certText = fs.readFileSync(path.join(keysDir, 'certificado.pem'), 'utf8');
const certMatch = certText.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
if (!certMatch) {
  console.error('No se encontró el bloque PEM del certificado en certificado.pem');
  process.exit(1);
}
const certificate = certMatch[0].trim();

try {
  const key = crypto.createPrivateKey(privateKey);
  const x509 = new crypto.X509Certificate(certificate);
  const pubFromCert = x509.publicKey.export({ type: 'spki', format: 'der' });
  const pubFromKey = crypto.createPublicKey(key).export({ type: 'spki', format: 'der' });
  const match = pubFromCert.equals(pubFromKey);
  if (!match) {
    console.error('La llave privada NO corresponde al certificado.');
    process.exit(1);
  }
  console.log('Llave privada y certificado coinciden.');
  console.log('Sujeto:', x509.subject.split('/').join(' | '));
} catch (e) {
  console.error('Error validando certificado:', e.message);
  process.exit(1);
}

const p = new PrismaClient();
(async () => {
  const r = await p.company.updateMany({
    where: { state: 1 },
    data: { archivePrivateKey: privateKey, archivePublicKey: certificate },
  });
  console.log('Certificado guardado en company (empresas actualizadas:', r.count + ')');
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});