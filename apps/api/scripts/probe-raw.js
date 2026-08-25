const token = process.env.SIAT_TOKEN;

const content =
  `<SolicitudSincronizacion>` +
  `<codigoAmbiente>2</codigoAmbiente>` +
  `<codigoPuntoVenta>0</codigoPuntoVenta>` +
  `<codigoSistema>7755FB9029E483B79F80E2F</codigoSistema>` +
  `<codigoSucursal>0</codigoSucursal>` +
  `<cuis>7C2F4B55</cuis>` +
  `<nit>2947679018</nit>` +
  `</SolicitudSincronizacion>`;

const body =
  `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="https://siat.impuestos.gob.bo/">` +
  `<soapenv:Header/><soapenv:Body>` +
  `<ser:sincronizarListaProductosServicios>${content}</ser:sincronizarListaProductosServicios>` +
  `</soapenv:Body></soapenv:Envelope>`;

(async () => {
  const res = await fetch(
    'https://pilotosiatservicios.impuestos.gob.bo/v2/FacturacionSincronizacion',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        SOAPAction: '""',
        apiKey: `TokenApi ${token}`,
      },
      body,
    },
  );
  const text = await res.text();
  console.log('HTTP', res.status);
  console.log(text);
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});