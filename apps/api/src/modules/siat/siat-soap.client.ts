import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { SiatConfig } from './siat-config.service';

/**
 * Cliente SOAP real contra los servicios de Facturación del SIAT (v2).
 *
 * Endpoints (ambiente Piloto):
 *  - Códigos:       {baseUrl}/FacturacionCodigos
 *  - Emisión:       {baseUrl}/ServicioFacturacionElectronica (modalidad 1)
 *                   {baseUrl}/ServicioFacturacionComputarizada (modalidad 2)
 *
 * Autenticación: cabecera HTTP "apiKey: TokenApi <token>" (token delegado V2).
 * Namespace de operaciones: https://siat.impuestos.gob.bo/
 */

const NAMESPACE = 'https://siat.impuestos.gob.bo/';

const TIMEOUT_MS = Number(process.env.SIAT_TIMEOUT_MS ?? 60000);
const REINTENTOS = Number(process.env.SIAT_REINTENTOS ?? 1);

export interface MensajeSiat {
  codigo?: string;
  descripcion?: string;
}

export interface RespuestaVerificarComunicacion {
  transaccion: boolean;
  codigo?: number;
  descripcion?: string;
  mensajes: MensajeSiat[];
}

export interface RespuestaCuis {
  codigo?: string;
  fechaVigencia?: string;
  transaccion: boolean;
  mensajes: MensajeSiat[];
}

export interface RespuestaCufd {
  codigo?: string;
  codigoControl?: string;
  direccion?: string;
  fechaVigencia?: string;
  transaccion: boolean;
  mensajes: MensajeSiat[];
}

export interface ParamsRecepcionFactura {
  archivo: string;
  fechaEnvio: string;
  hashArchivo: string;
  cufd: string;
  cuis: string;
  codigoDocumentoSector: number;
  codigoEmision: number;
  tipoFacturaDocumento: number;
  codigoPuntoVenta?: number;
}

export interface RespuestaRecepcionFactura {
  transaccion: boolean;
  codigoEstado?: number;
  codigoRecepcion?: string;
  codigoDescripcion?: string;
  mensajes: MensajeSiat[];
}

export interface ActividadSiat {
  codigoCaeb?: string;
  descripcion?: string;
  tipoActividad?: string;
}

export interface ProductoSiat {
  codigoActividad?: string;
  codigoProductoSin?: string;
  descripcionProducto?: string;
}

export interface PuntoVentaSiat {
  codigoPuntoVenta?: number;
  nombrePuntoVenta?: string;
  descripcion?: string;
  tipoPuntoVenta?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapEnvelope(method: string, content: string): string {
  return (
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="${NAMESPACE}">` +
    `<soapenv:Header/>` +
    `<soapenv:Body>` +
    `<ser:${method}>${content}</ser:${method}>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`
  );
}

@Injectable()
export class SiatSoapClient {
  private readonly parser = new XMLParser({
    removeNSPrefix: true,
    ignoreAttributes: true,
    parseTagValue: true,
    trimValues: true,
  });

  /** POST SOAP con timeout y reintentos; devuelve la Response cruda. */
  private async postSoap(url: string, body: string, token: string): Promise<Response> {
    let lastErr: Error | undefined;
    for (let attempt = 0; attempt <= REINTENTOS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        return await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            SOAPAction: '""',
            apiKey: `TokenApi ${token}`,
            'User-Agent': 'SFE-NODE/0.1 (NestJS)',
          },
          body,
          signal: controller.signal,
        });
      } catch (err) {
        lastErr = err as Error;
      } finally {
        clearTimeout(timer);
      }
    }
    const msg = lastErr?.message ?? '';
    const isAbort = lastErr?.name === 'AbortError' || /abort/i.test(msg);
    if (isAbort) {
      throw new Error(`SIAT timeout después de ${TIMEOUT_MS}ms (${url})`);
    }
    throw new Error(`SIAT sin conexión (${url}): ${msg}`);
  }

  /** POST SOAP al servicio y devuelve el primer elemento dentro de <Body> (la respuesta de la operación). */
  async invoke(
    url: string,
    method: string,
    content: string,
    token: string,
  ): Promise<Record<string, unknown>> {
    const body = wrapEnvelope(method, content);

    const res = await this.postSoap(url, body, token);

    const text = await res.text();

    let parsed: Record<string, unknown> = {};
    try {
      parsed = this.parser.parse(text) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
    const envelope = (parsed['Envelope'] ?? parsed) as Record<string, unknown>;
    const bodyObj = (envelope['Body'] ?? envelope) as Record<string, unknown>;

    const fault = bodyObj['Fault'] as Record<string, unknown> | undefined;
    if (fault) {
      const detail =
        (fault['faultstring'] as string) ??
        (fault['Reason'] as unknown) ??
        'Fault SOAP';
      throw new Error(`Fault SIAT: ${String(detail).slice(0, 500)}`);
    }

    if (!res.ok) {
      throw new Error(`SIAT HTTP ${res.status}: ${text.slice(0, 500)}`);
    }

    const first = Object.values(bodyObj)[0];
    return (first ?? {}) as Record<string, unknown>;
  }

  private mensajes(list: unknown): MensajeSiat[] {
    if (list == null) return [];
    const arr = Array.isArray(list) ? list : [list];
    return arr
      .filter((m) => m && typeof m === 'object')
      .map((m) => {
        const o = m as Record<string, unknown>;
        return {
          codigo: o['codigo'] != null ? String(o['codigo']) : undefined,
          descripcion: o['descripcion'] != null ? String(o['descripcion']) : undefined,
        };
      });
  }

  private esTransaccion(v: unknown): boolean {
    return v === true || v === 'true' || v === 1;
  }

  async verificarComunicacion(cfg: SiatConfig): Promise<RespuestaVerificarComunicacion> {
    const resp = await this.invoke(
      `${cfg.baseUrl}/FacturacionCodigos`,
      'verificarComunicacion',
      '',
      cfg.token,
    );
    const rc = (resp['RespuestaComunicacion'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      codigo: rc['codigo'] != null ? Number(rc['codigo']) : undefined,
      descripcion: rc['descripcion'] != null ? String(rc['descripcion']) : undefined,
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async solicitudCuis(
    cfg: SiatConfig,
    params: { codigoPuntoVenta?: number; codigoSucursal?: number },
  ): Promise<RespuestaCuis> {
    const content =
      `<SolicitudCuis>` +
      `<codigoAmbiente>${cfg.codigoAmbiente}</codigoAmbiente>` +
      `<codigoModalidad>${cfg.codigoModalidad}</codigoModalidad>` +
      `<codigoPuntoVenta>${params.codigoPuntoVenta ?? cfg.codigoPuntoVenta}</codigoPuntoVenta>` +
      `<codigoSistema>${escapeXml(cfg.codigoSistema)}</codigoSistema>` +
      `<codigoSucursal>${params.codigoSucursal ?? cfg.codigoSucursal}</codigoSucursal>` +
      `<nit>${cfg.nit}</nit>` +
      `</SolicitudCuis>`;

    const resp = await this.invoke(
      `${cfg.baseUrl}/FacturacionCodigos`,
      'cuis',
      content,
      cfg.token,
    );
    const rc = (resp['RespuestaCuis'] ?? resp) as Record<string, unknown>;
    return {
      codigo: rc['codigo'] != null ? String(rc['codigo']) : undefined,
      fechaVigencia: rc['fechaVigencia'] != null ? String(rc['fechaVigencia']) : undefined,
      transaccion: this.esTransaccion(rc['transaccion']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async solicitudCufd(
    cfg: SiatConfig,
    params: { codigoPuntoVenta?: number; codigoSucursal?: number; cuis: string },
  ): Promise<RespuestaCufd> {
    const content =
      `<SolicitudCufd>` +
      `<codigoAmbiente>${cfg.codigoAmbiente}</codigoAmbiente>` +
      `<codigoModalidad>${cfg.codigoModalidad}</codigoModalidad>` +
      `<codigoPuntoVenta>${params.codigoPuntoVenta ?? cfg.codigoPuntoVenta}</codigoPuntoVenta>` +
      `<codigoSistema>${escapeXml(cfg.codigoSistema)}</codigoSistema>` +
      `<codigoSucursal>${params.codigoSucursal ?? cfg.codigoSucursal}</codigoSucursal>` +
      `<cuis>${escapeXml(params.cuis)}</cuis>` +
      `<nit>${cfg.nit}</nit>` +
      `</SolicitudCufd>`;

    const resp = await this.invoke(
      `${cfg.baseUrl}/FacturacionCodigos`,
      'cufd',
      content,
      cfg.token,
    );
    const rc = (resp['RespuestaCufd'] ?? resp) as Record<string, unknown>;
    return {
      codigo: rc['codigo'] != null ? String(rc['codigo']) : undefined,
      codigoControl: rc['codigoControl'] != null ? String(rc['codigoControl']) : undefined,
      direccion: rc['direccion'] != null ? String(rc['direccion']) : undefined,
      fechaVigencia: rc['fechaVigencia'] != null ? String(rc['fechaVigencia']) : undefined,
      transaccion: this.esTransaccion(rc['transaccion']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async recepcionFactura(
    cfg: SiatConfig,
    params: ParamsRecepcionFactura,
  ): Promise<RespuestaRecepcionFactura> {
    const servicePath =
      params.codigoDocumentoSector === 1
        ? 'ServicioFacturacionCompraVenta'
        : cfg.codigoModalidad === 1
          ? 'ServicioFacturacionElectronica'
          : 'ServicioFacturacionComputarizada';

    const content =
      `<SolicitudServicioRecepcionFactura>` +
      `<archivo>${params.archivo}</archivo>` +
      `<fechaEnvio>${params.fechaEnvio}</fechaEnvio>` +
      `<hashArchivo>${params.hashArchivo}</hashArchivo>` +
      `<codigoAmbiente>${cfg.codigoAmbiente}</codigoAmbiente>` +
      `<codigoDocumentoSector>${params.codigoDocumentoSector}</codigoDocumentoSector>` +
      `<codigoEmision>${params.codigoEmision}</codigoEmision>` +
      `<codigoModalidad>${cfg.codigoModalidad}</codigoModalidad>` +
      `<codigoPuntoVenta>${params.codigoPuntoVenta ?? cfg.codigoPuntoVenta}</codigoPuntoVenta>` +
      `<codigoSistema>${escapeXml(cfg.codigoSistema)}</codigoSistema>` +
      `<codigoSucursal>${cfg.codigoSucursal}</codigoSucursal>` +
      `<cufd>${escapeXml(params.cufd)}</cufd>` +
      `<cuis>${escapeXml(params.cuis)}</cuis>` +
      `<nit>${cfg.nit}</nit>` +
      `<tipoFacturaDocumento>${params.tipoFacturaDocumento}</tipoFacturaDocumento>` +
      `</SolicitudServicioRecepcionFactura>`;

    const resp = await this.invoke(
      `${cfg.baseUrl}/${servicePath}`,
      'recepcionFactura',
      content,
      cfg.token,
    );
    const rc = (resp['RespuestaServicioFacturacion'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      codigoEstado: rc['codigoEstado'] != null ? Number(rc['codigoEstado']) : undefined,
      codigoRecepcion: rc['codigoRecepcion'] != null ? String(rc['codigoRecepcion']) : undefined,
      codigoDescripcion:
        rc['codigoDescripcion'] != null ? String(rc['codigoDescripcion']) : undefined,
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  private async sincronizar(
    cfg: SiatConfig,
    operacion: string,
    cuis: string,
    codigoPuntoVenta: number,
  ): Promise<Record<string, unknown>> {
    const content =
      `<SolicitudSincronizacion>` +
      `<codigoAmbiente>${cfg.codigoAmbiente}</codigoAmbiente>` +
      `<codigoPuntoVenta>${codigoPuntoVenta}</codigoPuntoVenta>` +
      `<codigoSistema>${escapeXml(cfg.codigoSistema)}</codigoSistema>` +
      `<codigoSucursal>${cfg.codigoSucursal}</codigoSucursal>` +
      `<cuis>${escapeXml(cuis)}</cuis>` +
      `<nit>${cfg.nit}</nit>` +
      `</SolicitudSincronizacion>`;

    return this.invoke(
      `${cfg.baseUrl}/FacturacionSincronizacion`,
      operacion,
      content,
      cfg.token,
    );
  }

  async sincronizarActividades(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; actividades: ActividadSiat[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarActividades',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaActividades'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      actividades: this.lista(rc['listaActividades']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarListaProductosServicios(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; productos: ProductoSiat[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarListaProductosServicios',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaProductos'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      productos: this.lista(rc['listaCodigos']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarParametricaTiposFactura(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; codigos: any[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarParametricaTiposFactura',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaParametricas'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      codigos: this.lista(rc['listaCodigos']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarParametricaMotivoAnulacion(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; codigos: any[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarParametricaMotivoAnulacion',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaParametricas'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      codigos: this.lista(rc['listaCodigos']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarParametricaTipoMetodoPago(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; codigos: any[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarParametricaTipoMetodoPago',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaParametricas'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      codigos: this.lista(rc['listaCodigos']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarParametricaTipoMoneda(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; codigos: any[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarParametricaTipoMoneda',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaParametricas'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      codigos: this.lista(rc['listaCodigos']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarParametricaUnidadMedida(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; codigos: any[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarParametricaUnidadMedida',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaParametricas'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      codigos: this.lista(rc['listaCodigos']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarParametricaTipoDocumentoIdentidad(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; codigos: any[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarParametricaTipoDocumentoIdentidad',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaParametricas'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      codigos: this.lista(rc['listaCodigos']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarParametricaTipoPuntoVenta(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; codigos: any[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarParametricaTipoPuntoVenta',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaParametricas'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      codigos: this.lista(rc['listaCodigos']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarParametricaTipoDocumentoSector(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; codigos: any[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarParametricaTipoDocumentoSector',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaParametricas'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      codigos: this.lista(rc['listaCodigos']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarListaActividadesDocumentoSector(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; actividades: any[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarListaActividadesDocumentoSector',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaActividadesDocumentoSector'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      actividades: this.lista(rc['listaActividadesDocumentoSector']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarListaLeyendasFactura(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; leyendas: any[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarListaLeyendasFactura',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaParametricasLeyendas'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      leyendas: this.lista(rc['listaLeyendas']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async sincronizarParametricaEventosSignificativos(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; codigos: any[]; mensajes: MensajeSiat[] }> {
    const resp = await this.sincronizar(
      cfg,
      'sincronizarParametricaEventosSignificativos',
      params.cuis,
      params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
    );
    const rc = (resp['RespuestaListaParametricas'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      codigos: this.lista(rc['listaCodigos']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async consultaPuntoVenta(
    cfg: SiatConfig,
    params: { cuis: string; codigoPuntoVenta?: number },
  ): Promise<{ transaccion: boolean; puntosVenta: PuntoVentaSiat[]; mensajes: MensajeSiat[] }> {
    const content =
      `<SolicitudConsultaPuntoVenta>` +
      `<codigoAmbiente>${cfg.codigoAmbiente}</codigoAmbiente>` +
      `<codigoSistema>${escapeXml(cfg.codigoSistema)}</codigoSistema>` +
      `<codigoSucursal>${cfg.codigoSucursal}</codigoSucursal>` +
      `<cuis>${escapeXml(params.cuis)}</cuis>` +
      `<nit>${cfg.nit}</nit>` +
      `</SolicitudConsultaPuntoVenta>`;

    const resp = await this.invoke(
      `${cfg.baseUrl}/FacturacionOperaciones`,
      'consultaPuntoVenta',
      content,
      cfg.token,
    );
    const rc = (resp['RespuestaConsultaPuntoVenta'] ?? resp) as Record<string, unknown>;
    return {
      transaccion: this.esTransaccion(rc['transaccion']),
      puntosVenta: this.lista(rc['listaPuntosVentas']),
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  async verificacionNit(
    cfg: SiatConfig,
    params: { nit: string; cuis: string; codigoSucursal?: number },
  ): Promise<{ transaccion: boolean; valido: boolean; mensajes: MensajeSiat[] }> {
    const content =
      `<SolicitudVerificarNit>` +
      `<codigoAmbiente>${cfg.codigoAmbiente}</codigoAmbiente>` +
      `<codigoModalidad>${cfg.codigoModalidad}</codigoModalidad>` +
      `<codigoSistema>${escapeXml(cfg.codigoSistema)}</codigoSistema>` +
      `<codigoSucursal>${params.codigoSucursal ?? cfg.codigoSucursal}</codigoSucursal>` +
      `<cuis>${escapeXml(params.cuis)}</cuis>` +
      `<nit>${cfg.nit}</nit>` +
      `<nitParaVerificacion>${escapeXml(params.nit)}</nitParaVerificacion>` +
      `</SolicitudVerificarNit>`;

    const resp = await this.invoke(
      `${cfg.baseUrl}/FacturacionCodigos`,
      'verificarNit',
      content,
      cfg.token,
    );
    const rc = (resp['RespuestaVerificarNit'] ?? resp) as Record<string, unknown>;
    const transaccion = this.esTransaccion(rc['transaccion']);
    return {
      transaccion,
      valido: transaccion,
      mensajes: this.mensajes(rc['mensajesList']),
    };
  }

  private lista<T extends object>(list: unknown): T[] {
    if (list == null) return [];
    const arr = Array.isArray(list) ? list : [list];
    return arr.filter((m) => m && typeof m === 'object') as T[];
  }
}