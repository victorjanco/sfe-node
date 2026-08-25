import { afterEach, describe, expect, it, vi } from 'vitest';
import { SiatSoapClient } from './siat-soap.client';
import { SiatConfig } from './siat-config.service';

const cfg: SiatConfig = {
  enabled: true,
  baseUrl: 'https://piloto.example/v2',
  token: 'TOKEN-ABC',
  codigoAmbiente: 2,
  codigoModalidad: 2,
  codigoSistema: '95FC61B3BA7',
  nit: '370395025',
  codigoSucursal: 0,
  codigoPuntoVenta: 0,
  privateKey: null,
  publicKey: null,
};

function mockFetch(responseBody: string, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(responseBody),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('SiatSoapClient', () => {
  it('verificarComunicacion construye el SOAP y parsea la respuesta', async () => {
    const fetchFn = mockFetch(
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">' +
        '<soapenv:Body>' +
        '<ns2:verificarComunicacionResponse xmlns:ns2="https://siat.impuestos.gob.bo/">' +
        '<ns2:RespuestaComunicacion>' +
        '<ns2:mensajesList><ns2:codigo>926</ns2:codigo><ns2:descripcion>Comunicacion Exitosa</ns2:descripcion></ns2:mensajesList>' +
        '<ns2:transaccion>true</ns2:transaccion>' +
        '</ns2:RespuestaComunicacion>' +
        '</ns2:verificarComunicacionResponse>' +
        '</soapenv:Body></soapenv:Envelope>',
    );

    const client = new SiatSoapClient();
    const r = await client.verificarComunicacion(cfg);

    expect(r.transaccion).toBe(true);
    expect(r.mensajes[0].codigo).toBe('926');
    expect(fetchFn).toHaveBeenCalledWith(
      'https://piloto.example/v2/FacturacionCodigos',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ apiKey: 'TokenApi TOKEN-ABC' }),
      }),
    );
    const body = fetchFn.mock.calls[0][1].body as string;
    expect(body).toContain('<ser:verificarComunicacion>');
  });

  it('recepcionFactura construye el envelope con los parámetros SIAT (modalidad computarizada)', async () => {
    const fetchFn = mockFetch(
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">' +
        '<soapenv:Body>' +
        '<ns2:recepcionFacturaResponse xmlns:ns2="https://siat.impuestos.gob.bo/">' +
        '<ns2:RespuestaServicioFacturacion>' +
        '<ns2:codigoDescripcion>Comunicacion Exitosa</ns2:codigoDescripcion>' +
        '<ns2:codigoEstado>902</ns2:codigoEstado>' +
        '<ns2:codigoRecepcion>REC123</ns2:codigoRecepcion>' +
        '<ns2:transaccion>true</ns2:transaccion>' +
        '</ns2:RespuestaServicioFacturacion>' +
        '</ns2:recepcionFacturaResponse>' +
        '</soapenv:Body></soapenv:Envelope>',
    );

    const client = new SiatSoapClient();
    const r = await client.recepcionFactura(cfg, {
      archivo: 'QmFzZTY0',
      fechaEnvio: '2026-08-13T15:22:46',
      hashArchivo: 'abc123',
      cufd: 'CUFD1',
      cuis: 'CUIS1',
      codigoDocumentoSector: 2,
      codigoEmision: 1,
      tipoFacturaDocumento: 1,
    });

    expect(r.transaccion).toBe(true);
    expect(r.codigoEstado).toBe(902);
    expect(r.codigoRecepcion).toBe('REC123');

    const url = fetchFn.mock.calls[0][0] as string;
    const body = fetchFn.mock.calls[0][1].body as string;
    expect(url).toContain('ServicioFacturacionComputarizada');
    expect(body).toContain('<ser:recepcionFactura>');
    expect(body).toContain('<SolicitudServicioRecepcionFactura>');
    expect(body).toContain('<codigoSistema>95FC61B3BA7</codigoSistema>');
    expect(body).toContain('<codigoSucursal>0</codigoSucursal>');
    expect(body).toContain('<nit>370395025</nit>');
    expect(body).toContain('<cufd>CUFD1</cufd>');
    expect(body).toContain('<cuis>CUIS1</cuis>');
    expect(body).toContain('<tipoFacturaDocumento>1</tipoFacturaDocumento>');
    expect(body).toContain('<codigoEmision>1</codigoEmision>');
    expect(body).toContain('<hashArchivo>abc123</hashArchivo>');
  });

  it('elige el servicio electrónico cuando la modalidad es 1', async () => {
    mockFetch(
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body>' +
        '<ns2:recepcionFacturaResponse xmlns:ns2="https://siat.impuestos.gob.bo/"><ns2:RespuestaServicioFacturacion><ns2:transaccion>true</ns2:transaccion></ns2:RespuestaServicioFacturacion></ns2:recepcionFacturaResponse>' +
        '</soapenv:Body></soapenv:Envelope>',
    );
    const client = new SiatSoapClient();
    const electr = { ...cfg, codigoModalidad: 1 };
    await client.recepcionFactura(electr, {
      archivo: 'x',
      fechaEnvio: '2026-08-13T15:22:46',
      hashArchivo: 'h',
      cufd: 'c',
      cuis: 'c',
      codigoDocumentoSector: 2,
      codigoEmision: 1,
      tipoFacturaDocumento: 1,
    });
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('ServicioFacturacionElectronica');
  });

  it('usa el servicio de Compra Venta para el sector 1 (cualquier modalidad)', async () => {
    mockFetch(
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body>' +
        '<ns2:recepcionFacturaResponse xmlns:ns2="https://siat.impuestos.gob.bo/ServicioFacturacionCompraVenta"><ns2:RespuestaServicioFacturacion><ns2:transaccion>true</ns2:transaccion></ns2:RespuestaServicioFacturacion></ns2:recepcionFacturaResponse>' +
        '</soapenv:Body></soapenv:Envelope>',
    );
    const client = new SiatSoapClient();
    const electr = { ...cfg, codigoModalidad: 1 };
    await client.recepcionFactura(electr, {
      archivo: 'x',
      fechaEnvio: '2026-08-13T15:22:46',
      hashArchivo: 'h',
      cufd: 'c',
      cuis: 'c',
      codigoDocumentoSector: 1,
      codigoEmision: 1,
      tipoFacturaDocumento: 1,
    });
    const url = vi.mocked(fetch).mock.calls[0][0];
    expect(url).toContain('ServicioFacturacionCompraVenta');
    expect(vi.mocked(fetch).mock.calls[0][1].body).toContain('<ser:recepcionFactura>');
  });

  it('lanza un error descriptivo ante un Fault SOAP', async () => {
    mockFetch(
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body>' +
        '<soapenv:Fault><faultstring>Token invalido</faultstring></soapenv:Fault>' +
        '</soapenv:Body></soapenv:Envelope>',
    );
    const client = new SiatSoapClient();
    await expect(client.verificarComunicacion(cfg)).rejects.toThrow('Fault SIAT: Token invalido');
  });
});