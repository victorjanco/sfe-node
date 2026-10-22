import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { gzipSync } from 'zlib';
import { SiatConfigService } from './siat-config.service';
import { SiatSoapClient, ParamsRecepcionPaqueteFactura, ParamsValidacionPaqueteFactura } from './siat-soap.client';
import { firmarFacturaXml } from './firma-xml';

/**
 * Cliente de emisión SIAT.
 *
 * Con SIAT_ENABLED=true realiza llamadas SOAP reales (FacturacionCodigos y
 * ServicioFacturacionElectronica/Computarizada). En modo demo (default) mantiene
 * el comportamiento local simulado para no romper el flujo sin credenciales.
 */

export interface PrepararArchivoResult {
  archivo: string;
  hashArchivo: string;
  xmlFirmado: string;
}

export interface RecepcionFacturaRequest {
  archivo: string;
  hashArchivo: string;
  fechaEnvio: string;
  cufd: string;
  cuis: string;
  codigoDocumentoSector: number;
  codigoEmision: number;
  tipoFacturaDocumento: number;
}

export interface RecepcionFacturaResult {
  transaccion: boolean;
  codigoEstado?: number;
  codigoRecepcion?: string;
  codigoDescripcion?: string;
  errores?: unknown[];
}

export interface VerificarComunicacionResult {
  transaccion: boolean;
  codigo?: number;
  descripcion?: string;
}

@Injectable()
export class SiatEmisionClient {
  constructor(
    private readonly config: SiatConfigService,
    private readonly soap: SiatSoapClient,
  ) {}

  /** Firma (si aplica), comprime (gzip) y hashea el XML; devuelve archivo y hash para enviar al SIAT. */
  async prepararArchivo(xml: string): Promise<PrepararArchivoResult> {
    const cfg = await this.config.get();
    let xmlFirmado = xml;
    if (cfg.enabled) {
      if (!cfg.privateKey || !cfg.publicKey) {
        throw new Error(
          'SIAT habilitado pero no se configuró el certificado digital ' +
            '(archive_private_key / archive_public_key de la empresa).',
        );
      }
      xmlFirmado = firmarFacturaXml({
        xml,
        privateKey: cfg.privateKey,
        certificate: cfg.publicKey,
      });
    }
    const gz = gzipSync(Buffer.from(xmlFirmado, 'utf-8'));
    return {
      archivo: gz.toString('base64'),
      hashArchivo: createHash('sha256').update(gz).digest('hex'),
      xmlFirmado,
    };
  }

  async verificarComunicacion(): Promise<VerificarComunicacionResult> {
    const cfg = await this.config.get();
    if (!cfg.enabled) return { transaccion: true };
    return this.soap.verificarComunicacion(cfg);
  }

  async recepcionFactura(request: RecepcionFacturaRequest): Promise<RecepcionFacturaResult> {
    const cfg = await this.config.get();
    if (!cfg.enabled) {
      const codigoRecepcion = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      return { transaccion: true, codigoEstado: 900, codigoRecepcion };
    }
    const r = await this.soap.recepcionFactura(cfg, {
      ...request,
      codigoPuntoVenta: cfg.codigoPuntoVenta,
    });
    return {
      transaccion: r.transaccion,
      codigoEstado: r.codigoEstado,
      codigoRecepcion: r.codigoRecepcion,
      codigoDescripcion: r.codigoDescripcion,
      errores: r.mensajes,
    };
  }

  // ---------------------------------------------------------------------------
  // Registro de evento significativo
  // ---------------------------------------------------------------------------

  async registroEventoSignificativo(params: {
    codigoMotivoEvento: number;
    cuis: string;
    cufd: string;
    cufdEvento: string;
    descripcion: string;
    fechaHoraInicioEvento: string;
    fechaHoraFinEvento: string;
    codigoPuntoVenta?: number;
    codigoSucursal?: number;
  }): Promise<{ transaccion: boolean; codigoRecepcionEventoSignificativo?: string }> {
    const cfg = await this.config.get();
    if (!cfg.enabled) {
      const code = `EVT-${Date.now()}`;
      return { transaccion: true, codigoRecepcionEventoSignificativo: code };
    }
    return this.soap.registroEventoSignificativo(cfg, {
      ...params,
      codigoPuntoVenta: params.codigoPuntoVenta ?? cfg.codigoPuntoVenta,
      codigoSucursal: params.codigoSucursal ?? cfg.codigoSucursal,
    });
  }

  // ---------------------------------------------------------------------------
  // Recepción paquete de facturas (contingencia / offline)
  // ---------------------------------------------------------------------------

  async recepcionPaqueteFactura(params: Omit<ParamsRecepcionPaqueteFactura, 'codigoPuntoVenta'>): Promise<RecepcionFacturaResult> {
    const cfg = await this.config.get();
    if (!cfg.enabled) {
      const codigoRecepcion = `PAQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      return { transaccion: true, codigoEstado: 900, codigoRecepcion };
    }
    const r = await this.soap.recepcionPaqueteFactura(cfg, {
      ...params,
      codigoPuntoVenta: cfg.codigoPuntoVenta,
    });
    return {
      transaccion: r.transaccion,
      codigoEstado: r.codigoEstado,
      codigoRecepcion: r.codigoRecepcion,
      codigoDescripcion: r.codigoDescripcion,
      errores: r.mensajes,
    };
  }

  // ---------------------------------------------------------------------------
  // Validación recepción paquete
  // ---------------------------------------------------------------------------

  async validacionRecepcionPaqueteFactura(params: Omit<ParamsValidacionPaqueteFactura, 'codigoPuntoVenta'>): Promise<RecepcionFacturaResult> {
    const cfg = await this.config.get();
    if (!cfg.enabled) {
      return { transaccion: true, codigoEstado: 907, codigoRecepcion: params.codigoRecepcion };
    }
    const r = await this.soap.validacionRecepcionPaqueteFactura(cfg, {
      ...params,
      codigoPuntoVenta: cfg.codigoPuntoVenta,
    });
    return {
      transaccion: r.transaccion,
      codigoEstado: r.codigoEstado,
      codigoRecepcion: r.codigoRecepcion,
      codigoDescripcion: r.codigoDescripcion,
      errores: r.mensajes,
    };
  }

  // ---------------------------------------------------------------------------
  // Empaquetado de facturas (TarGz + SHA256)
  // ---------------------------------------------------------------------------

  prepararPaqueteFacturas(xmls: string[]): { archivo: string; hashArchivo: string; cantidadFacturas: number } {
    const { execFileSync } = require('child_process');
    const pathMod = require('path');
    const { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } = require('fs');
    const { randomBytes } = require('crypto');

    const tmpDir = pathMod.join(process.cwd(), 'tmp_tar_' + randomBytes(6).toString('hex'));
    mkdirSync(tmpDir, { recursive: true });

    for (let i = 0; i < xmls.length; i++) {
      writeFileSync(pathMod.join(tmpDir, `${i}.xml`), xmls[i], 'utf-8');
    }

    const tarPath = pathMod.join(tmpDir, 'paq.tar');
    const files = xmls.map((_, i) => `${i}.xml`);
    execFileSync('tar', ['cf', tarPath, '-C', tmpDir, ...files]);

    const tarBuffer = readFileSync(tarPath);
    const gz = gzipSync(tarBuffer);

    try { rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

    return {
      archivo: gz.toString('base64'),
      hashArchivo: createHash('sha256').update(gz).digest('hex'),
      cantidadFacturas: xmls.length,
    };
  }
}