import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface SiatConfig {
  enabled: boolean;
  baseUrl: string;
  token: string;
  codigoAmbiente: number;
  codigoModalidad: number;
  codigoSistema: string;
  nit: string;
  codigoSucursal: number;
  codigoPuntoVenta: number;
  privateKey: string | null;
  publicKey: string | null;
}

export function certificadosDir(): string {
  return process.env.SIAT_KEYS_DIR ?? join(process.cwd(), 'keys');
}

export function leerCertificado(nombre: string): string | null {
  const file = join(certificadosDir(), nombre);
  if (!existsSync(file)) return null;
  return readFileSync(file, 'utf8');
}

function bufferToString(v: unknown, fallback: string | null = null): string | null {
  if (v == null) return fallback;
  if (typeof v === 'string') return v;
  if (typeof (v as any).toString === 'function') {
    if (v instanceof Uint8Array || Buffer.isBuffer(v as any)) {
      try { return Buffer.from(v as any).toString('utf8'); } catch { return fallback; }
    }
    const s = String(v);
    return s;
  }
  return fallback;
}

@Injectable()
export class SiatConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SiatConfig> {
    const company = await this.prisma.company.findFirst({ where: { state: 1 } });
    const token = await this.prisma.token.findFirst({ where: { state: 1 } });
    const branch = await this.prisma.branchOffice.findFirst({ where: { state: 1 } });
    const point = await this.prisma.pointSale.findFirst({ where: { state: 1 } });

    return {
      enabled: (process.env.SIAT_ENABLED ?? 'false') === 'true',
      baseUrl:
        process.env.SIAT_BASE_URL ?? 'https://pilotosiatservicios.impuestos.gob.bo/v2',
      token: process.env.SIAT_TOKEN ?? token?.value ?? '',
      codigoAmbiente: Number(process.env.SIAT_AMBIENTE ?? company?.environmentCode ?? 2),
      codigoModalidad: Number(process.env.SIAT_MODALIDAD ?? company?.modalityCode ?? 2),
      codigoSistema: process.env.SIAT_SISTEMA ?? company?.systemCode ?? '',
      nit: process.env.SIAT_NIT ?? branch?.nit ?? company?.nit ?? '',
      codigoSucursal: Number(branch?.code ?? 0),
      codigoPuntoVenta: Number(point?.pointSaleCode ?? 0),
      privateKey:
        process.env.SIAT_PRIVATE_KEY ??
        bufferToString(company?.archivePrivateKey) ??
        leerCertificado('claveprivadakey.pem'),
      publicKey:
        process.env.SIAT_PUBLIC_KEY ??
        bufferToString(company?.archivePublicKey) ??
        leerCertificado('certificado.pem'),
    };
  }
}