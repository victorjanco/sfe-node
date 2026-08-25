const { SiatSoapClient } = require('../dist-build/modules/siat/siat-soap.client');

async function main() {
  const client = new SiatSoapClient();
  const cfg = {
    enabled: true,
    baseUrl: 'https://pilotosiatservicios.impuestos.gob.bo/v2',
    token: process.env.SIAT_TOKEN,
    codigoAmbiente: 2,
    codigoModalidad: 1,
    codigoSistema: '7755FB9029E483B79F80E2F',
    nit: '2947679018',
    codigoSucursal: 0,
    codigoPuntoVenta: 0,
    privateKey: null,
    publicKey: null,
  };
  const r = await client.sincronizarActividades(cfg, { cuis: '7C2F4B55' });
  console.log('RESPUESTA sincronizarActividades:', JSON.stringify(r, null, 2));
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});