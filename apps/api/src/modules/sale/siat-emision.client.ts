import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { gzipSync } from 'zlib';
import { SiatConfigService } from '../siat/siat-config.service';
import { SiatSoapClient } from '../siat/siat-soap.client';
import { firmarFacturaXml } from '../siat/firma-xml';

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
}