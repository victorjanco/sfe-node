import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../../prisma/prisma.service';
import { SiatConfigService, certificadosDir, leerCertificado } from './siat-config.service';
import { SiatSoapClient, MensajeSiat } from './siat-soap.client';
import { DISABLE, ENABLE } from '../../common/siat.constants';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

function descripcionErrores(mensajes: MensajeSiat[]): string {
  return mensajes
    .map((m) => `${m.codigo ?? ''} ${m.descripcion ?? ''}`.trim())
    .filter(Boolean)
    .join('; ');
}

@Controller('siat')
export class SiatController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: SiatConfigService,
    private readonly soap: SiatSoapClient,
  ) {}

  @CheckAbility({ action: Action.Read, subject: 'Siat' })
  @Get('active')
  async active() {
    const token = await this.prisma.token.findFirst({ where: { state: 1 } });
    const cuis = await this.prisma.cuis.findFirst({
      where: { state: 1 },
      orderBy: { id: 'desc' },
    });
    const cufd = await this.prisma.cufd.findFirst({
      where: { state: 1 },
      orderBy: { id: 'desc' },
    });
    const cfg = await this.config.get();
    return { enabled: cfg.enabled, token, cuis, cufd };
  }

  @CheckAbility({ action: Action.Read, subject: 'Siat' })
  @Get('certificados')
  async estadoCertificados() {
    const dir = certificadosDir();
    const company = await this.prisma.company.findFirst({ where: { state: 1 } });
    const nombres = ['certificado.pem', 'claveprivadakey.pem'];
    return {
      directorio: dir,
      empresa: company ? { id: company.id, archivePublicKey: company.archivePublicKey, archivePrivateKey: company.archivePrivateKey } : null,
      certificados: nombres.map((nombre) => {
        const path = join(dir, nombre);
        return {
          nombre,
          existe: existsSync(path),
          ruta: path,
          bytes: existsSync(path) ? require('fs').statSync(path).size : 0,
        };
      }),
    };
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Post('certificados')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'certificado', maxCount: 1 },
      { name: 'clavePrivada', maxCount: 1 },
    ]),
  )
  async registrarCertificados(
    @UploadedFiles()
    files: {
      certificado?: Express.Multer.File[];
      clavePrivada?: Express.Multer.File[];
    },
  ) {
    const dir = certificadosDir();
    mkdirSync(dir, { recursive: true });

    const certificado = files?.certificado?.[0];
    const clavePrivada = files?.clavePrivada?.[0];

    if (certificado) {
      writeFileSync(join(dir, 'certificado.pem'), certificado.buffer);
    }
    if (clavePrivada) {
      writeFileSync(join(dir, 'claveprivadakey.pem'), clavePrivada.buffer);
    }

    const company = await this.prisma.company.findFirst({ where: { state: 1 } });
    if (company) {
      await this.prisma.company.update({
        where: { id: company.id },
        data: {
          archivePublicKey: certificado
            ? leerCertificado('certificado.pem')
            : company.archivePublicKey,
          archivePrivateKey: clavePrivada
            ? leerCertificado('claveprivadakey.pem')
            : company.archivePrivateKey,
        },
      });
    }

    return {
      transaccion: true,
      mensaje: 'Certificados registrados correctamente',
      certificado: {
        nombre: 'certificado.pem',
        existe: existsSync(join(dir, 'certificado.pem')),
        bytes: existsSync(join(dir, 'certificado.pem'))
          ? require('fs').statSync(join(dir, 'certificado.pem')).size
          : 0,
      },
      clavePrivada: {
        nombre: 'claveprivadakey.pem',
        existe: existsSync(join(dir, 'claveprivadakey.pem')),
        bytes: existsSync(join(dir, 'claveprivadakey.pem'))
          ? require('fs').statSync(join(dir, 'claveprivadakey.pem')).size
          : 0,
      },
    };
  }

  @CheckAbility({ action: Action.Read, subject: 'Siat' })
  @Get('verificar_comunicacion')
  async verificarComunicacion() {
    const cfg = await this.config.get();
    if (!cfg.enabled) {
      return { transaccion: true, mensaje: 'SIAT en modo demo (SIAT_ENABLED=false)' };
    }
    const r = await this.soap.verificarComunicacion(cfg);
    return { ...r, mensaje: r.transaccion ? 'Comunicación SIAT correcta' : 'Sin comunicación con SIAT' };
  }

  @CheckAbility({ action: Action.Read, subject: 'Siat' })
  @Get('verificar_nit')
  async verificarNit(@Query('nit') nit: string) {
    if (!nit || !nit.trim()) throw new BadRequestException('NIT requerido');
    const cfg = await this.config.get();
    if (!cfg.enabled) {
      return { transaccion: true, valido: true, nit: nit.trim(), mensaje: 'SIAT en modo demo (SIAT_ENABLED=false)' };
    }
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cuis) throw new BadRequestException('CUIS no disponible. Solicitar al SIAT.');
    const r = await this.soap.verificacionNit(cfg, { nit: nit.trim(), cuis: cuis.code });
    return {
      transaccion: r.transaccion,
      valido: r.valido,
      nit: nit.trim(),
      mensaje: r.valido
        ? 'NIT válido'
        : `NIT no válido: ${descripcionErrores(r.mensajes)}`,
      mensajes: r.mensajes,
    };
  }

  @CheckAbility({ action: Action.Read, subject: 'Siat' })
  @Get('punto_venta/sucursal/:branchOfficeId')
  async getPuntosVentaPorSucursal(@Param('branchOfficeId') branchOfficeId: string) {
    const puntosVenta = await this.prisma.pointSale.findMany({
      where: { branchOfficeId: Number(branchOfficeId), state: 1 },
      orderBy: { id: 'asc' },
    });
    return puntosVenta;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_parametros_siat')
  async sincronizarParametros() {
    const cfg = await this.config.get();
    if (!cfg.enabled) {
      return { transaccion: true, mensaje: 'Parámetros SIAT sincronizados (modo demo)' };
    }
    const comm = await this.soap.verificarComunicacion(cfg);
    return {
      transaccion: comm.transaccion,
      mensaje: comm.transaccion
        ? 'Comunicación con SIAT verificada'
        : `Sin comunicación con SIAT: ${descripcionErrores(comm.mensajes)}`,
    };
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_actividades')
  async sincronizarActividades() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, actividades: [] };
    const r = await this.soap.sincronizarActividades(cfg, {
      cuis: cuis?.code ?? '',
    });
    if (r.transaccion) {
      const { creados, actualizados } = await this.persistirActividades(r.actividades);
      return { ...r, persistidos: { creados, actualizados } };
    }
    return r;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_productos')
  async sincronizarProductos() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, productos: [] };
    const r = await this.soap.sincronizarListaProductosServicios(cfg, {
      cuis: cuis?.code ?? '',
    });
    if (r.transaccion) {
      const { creados, actualizados } = await this.persistirProductos(r.productos);
      return { ...r, persistidos: { creados, actualizados } };
    }
    return r;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_puntos_venta')
  async sincronizarPuntosVenta() {
    const cfg = await this.config.get();
    if (!cfg.enabled) return { transaccion: true, mensaje: 'SIAT en modo demo', puntosVenta: [] };

    const sucursales = await this.prisma.branchOffice.findMany({
      where: { state: ENABLE },
    });

    const resultados: any[] = [];
    const errores: string[] = [];

    for (const sucursal of sucursales) {
      const cuis = await this.prisma.cuis.findFirst({
        where: {
          branchOfficeId: sucursal.id,
          state: ENABLE,
          effectiveDate: { gte: new Date() },
        },
        orderBy: { id: 'desc' },
      });

      if (!cuis) {
        errores.push(`Sucursal ${sucursal.name}: No tiene CUIS vigente`);
        continue;
      }

      try {
        const resp = await this.soap.consultaPuntoVenta(cfg, {
          cuis: cuis.code,
          codigoPuntoVenta: sucursal.code,
        });

        if (!resp.transaccion) {
          errores.push(`Sucursal ${sucursal.name}: ${resp.mensajes?.[0]?.descripcion || 'Error en consulta'}`);
          continue;
        }

        const puntosVenta = resp.puntosVenta || [];
        let creados = 0;
        let actualizados = 0;

        for (const punto of resp.puntosVenta || []) {
          const codigoPuntoVenta = punto.codigoPuntoVenta;
          const nombrePuntoVenta = String(punto.nombrePuntoVenta ?? '');
          const tipoPuntoVentaDesc = String(punto.tipoPuntoVenta ?? '');

          if (!codigoPuntoVenta || !nombrePuntoVenta || !tipoPuntoVentaDesc) {
            errores.push(`Punto de venta con datos incompletos: ${JSON.stringify(punto)}`);
            continue;
          }

          let tipoPuntoVenta = await this.prisma.pointSaleType.findFirst({
            where: { description: tipoPuntoVentaDesc },
          });

          if (!tipoPuntoVenta) {
            tipoPuntoVenta = await this.prisma.pointSaleType.create({
              data: { classifierCode: '99', description: tipoPuntoVentaDesc, state: ENABLE },
            });
          }

          const puntoExistente = await this.prisma.pointSale.findFirst({
            where: { pointSaleCode: codigoPuntoVenta },
          });

          if (puntoExistente) {
            await this.prisma.pointSale.update({
              where: { id: puntoExistente.id },
              data: {
                pointSaleName: nombrePuntoVenta,
                description: nombrePuntoVenta,
                pointSaleTypeName: tipoPuntoVentaDesc,
                pointSaleTypeId: tipoPuntoVenta.id,
                branchOfficeId: sucursal.id,
              },
            });
            actualizados++;
          } else {
            await this.prisma.pointSale.create({
              data: {
                pointSaleCode: codigoPuntoVenta,
                pointSaleName: nombrePuntoVenta,
                description: nombrePuntoVenta,
                pointSaleTypeName: tipoPuntoVentaDesc,
                pointSaleTypeId: tipoPuntoVenta.id,
                branchOfficeId: sucursal.id,
                state: ENABLE,
              },
            });
            creados++;
          }
        }

        resultados.push({
          sucursal: sucursal.name,
          creados,
          actualizados,
          total: puntosVenta.length,
        });
      } catch (err: any) {
        errores.push(`Sucursal ${sucursal.name}: ${err.message}`);
      }
    }

    return {
      transaccion: errores.length === 0,
      mensaje: errores.length === 0
        ? 'Puntos de venta sincronizados correctamente'
        : `Errores: ${errores.join('; ')}`,
      resultados,
      errores,
    };
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_tipos_factura')
  async sincronizarTiposFactura() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, codigos: [] };
    const r = await this.soap.sincronizarParametricaTiposFactura(cfg, { cuis: cuis?.code ?? '' });
    if (r.transaccion) {
      const { creados, actualizados } = await this.persistirParametrica(this.prisma.typeInvoiceDocument, r.codigos);
      return { ...r, persistidos: { creados, actualizados } };
    }
    return r;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_motivo_anulacion')
  async sincronizarMotivoAnulacion() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, codigos: [] };
    const r = await this.soap.sincronizarParametricaMotivoAnulacion(cfg, { cuis: cuis?.code ?? '' });
    if (r.transaccion) {
      const { creados, actualizados } = await this.persistirParametrica(this.prisma.reasonCancellation, r.codigos);
      return { ...r, persistidos: { creados, actualizados } };
    }
    return r;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_tipo_metodo_pago')
  async sincronizarTipoMetodoPago() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, codigos: [] };
    const r = await this.soap.sincronizarParametricaTipoMetodoPago(cfg, { cuis: cuis?.code ?? '' });
    if (r.transaccion) {
      const { creados, actualizados } = await this.persistirParametrica(this.prisma.paymentMethodType, r.codigos);
      return { ...r, persistidos: { creados, actualizados } };
    }
    return r;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_tipo_moneda')
  async sincronizarTipoMoneda() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, codigos: [] };
    const r = await this.soap.sincronizarParametricaTipoMoneda(cfg, { cuis: cuis?.code ?? '' });
    if (r.transaccion) {
      const { creados, actualizados } = await this.persistirParametrica(this.prisma.currency, r.codigos);
      return { ...r, persistidos: { creados, actualizados } };
    }
    return r;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_unidad_medida')
  async sincronizarUnidadMedida() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, codigos: [] };
    const r = await this.soap.sincronizarParametricaUnidadMedida(cfg, { cuis: cuis?.code ?? '' });
    if (r.transaccion) {
      const { creados, actualizados } = await this.persistirParametrica(this.prisma.unitMeasure, r.codigos);
      return { ...r, persistidos: { creados, actualizados } };
    }
    return r;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_tipo_documento_identidad')
  async sincronizarTipoDocumentoIdentidad() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, codigos: [] };
    const r = await this.soap.sincronizarParametricaTipoDocumentoIdentidad(cfg, { cuis: cuis?.code ?? '' });
    if (r.transaccion) {
      const { creados, actualizados } = await this.persistirParametrica(this.prisma.identityDocumentType, r.codigos);
      return { ...r, persistidos: { creados, actualizados } };
    }
    return r;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_tipo_punto_venta')
  async sincronizarTipoPuntoVenta() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, codigos: [] };
    const resp = await this.soap.sincronizarParametricaTipoPuntoVenta(cfg, { cuis: cuis?.code ?? '' });
    if (resp.transaccion && Array.isArray(resp.codigos)) {
      for (const codigo of resp.codigos) {
        const classifierCode = String(codigo.codigoClasificador ?? '');
        const descripcion = String(codigo.descripcion ?? '');
        if (!classifierCode || !descripcion) continue;
        const existente = await this.prisma.pointSaleType.findFirst({
          where: { classifierCode },
        });
        if (existente) {
          await this.prisma.pointSaleType.update({
            where: { id: existente.id },
            data: { description: descripcion, state: ENABLE },
          });
        } else {
          await this.prisma.pointSaleType.create({
            data: { classifierCode, description: descripcion, state: ENABLE },
          });
        }
      }
    }
    return resp;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_tipo_documento_sector')
  async sincronizarTipoDocumentoSector() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, codigos: [] };
    const r = await this.soap.sincronizarParametricaTipoDocumentoSector(cfg, { cuis: cuis?.code ?? '' });
    if (r.transaccion) {
      const { creados, actualizados } = await this.persistirParametrica(this.prisma.sectorDocument, r.codigos);
      return { ...r, persistidos: { creados, actualizados } };
    }
    return r;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_actividades_documento_sector')
  async sincronizarActividadesDocumentoSector() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, actividades: [] };
    const r = await this.soap.sincronizarListaActividadesDocumentoSector(cfg, { cuis: cuis?.code ?? '' });
    if (r.transaccion) {
      const { creados, actualizados } = await this.persistirActividadesDocumentoSector(r.actividades);
      return { ...r, persistidos: { creados, actualizados } };
    }
    return r;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_leyendas_factura')
  async sincronizarLeyendasFactura() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, leyendas: [] };
    const r = await this.soap.sincronizarListaLeyendasFactura(cfg, { cuis: cuis?.code ?? '' });
    if (r.transaccion) {
      const { creados, actualizados } = await this.persistirLeyendas(r.leyendas);
      return { ...r, persistidos: { creados, actualizados } };
    }
    return r;
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Get('sincronizar_eventos_significativos')
  async sincronizarEventosSignificativos() {
    const cfg = await this.config.get();
    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cfg.enabled) return { transaccion: true, codigos: [] };
    return this.soap.sincronizarParametricaEventosSignificativos(cfg, { cuis: cuis?.code ?? '' });
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Post('sincronizar_parametros_siat')
  async sincronizarParametrosCompleto() {
    const cfg = await this.config.get();
    if (!cfg.enabled) return { transaccion: true, mensaje: 'Parámetros SIAT sincronizados (modo demo)' };

    const cuis = await this.prisma.cuis.findFirst({ where: { state: 1 } });
    if (!cuis) throw new BadRequestException('No hay CUIS vigente para sincronizar');

    const changeTypes = await this.prisma.changeType.findMany();
    if (changeTypes.length === 0) {
      await this.prisma.changeType.createMany({
        data: [
          { classifierCode: '1', description: 'Tipo de cambio venta', state: 1 },
          { classifierCode: '2', description: 'Tipo de cambio compra', state: 1 },
          { classifierCode: '3', description: 'Tipo de cambio promedio', state: 1 },
        ],
      });
    }

    const results: Record<string, any> = {};
    const errors: string[] = [];

    const syncCalls = [
      { name: 'tipos_factura', fn: () => this.soap.sincronizarParametricaTiposFactura(cfg, { cuis: cuis.code }) },
      { name: 'motivo_anulacion', fn: () => this.soap.sincronizarParametricaMotivoAnulacion(cfg, { cuis: cuis.code }) },
      { name: 'tipo_metodo_pago', fn: () => this.soap.sincronizarParametricaTipoMetodoPago(cfg, { cuis: cuis.code }) },
      { name: 'tipo_moneda', fn: () => this.soap.sincronizarParametricaTipoMoneda(cfg, { cuis: cuis.code }) },
      { name: 'unidad_medida', fn: () => this.soap.sincronizarParametricaUnidadMedida(cfg, { cuis: cuis.code }) },
      { name: 'tipo_documento_identidad', fn: () => this.soap.sincronizarParametricaTipoDocumentoIdentidad(cfg, { cuis: cuis.code }) },
      { name: 'tipo_punto_venta', fn: () => this.soap.sincronizarParametricaTipoPuntoVenta(cfg, { cuis: cuis.code }) },
      { name: 'actividades', fn: () => this.soap.sincronizarActividades(cfg, { cuis: cuis.code }) },
      { name: 'productos_servicios', fn: () => this.soap.sincronizarListaProductosServicios(cfg, { cuis: cuis.code }) },
      { name: 'tipo_documento_sector', fn: () => this.soap.sincronizarParametricaTipoDocumentoSector(cfg, { cuis: cuis.code }) },
      { name: 'actividades_documento_sector', fn: () => this.soap.sincronizarListaActividadesDocumentoSector(cfg, { cuis: cuis.code }) },
      { name: 'leyendas_factura', fn: () => this.soap.sincronizarListaLeyendasFactura(cfg, { cuis: cuis.code }) },
      { name: 'eventos_significativos', fn: () => this.soap.sincronizarParametricaEventosSignificativos(cfg, { cuis: cuis.code }) },
    ];

    for (const call of syncCalls) {
      try {
        const result: any = await call.fn();
        results[call.name] = result;
        if (result.transaccion) {
          const persistCounts: Record<string, any> = {};
          switch (call.name) {
            case 'tipos_factura':
              persistCounts.persistidos = await this.persistirParametrica(this.prisma.typeInvoiceDocument, result.codigos);
              break;
            case 'motivo_anulacion':
              persistCounts.persistidos = await this.persistirParametrica(this.prisma.reasonCancellation, result.codigos);
              break;
            case 'tipo_metodo_pago':
              persistCounts.persistidos = await this.persistirParametrica(this.prisma.paymentMethodType, result.codigos);
              break;
            case 'tipo_moneda':
              persistCounts.persistidos = await this.persistirParametrica(this.prisma.currency, result.codigos);
              break;
            case 'unidad_medida':
              persistCounts.persistidos = await this.persistirParametrica(this.prisma.unitMeasure, result.codigos);
              break;
            case 'tipo_documento_identidad':
              persistCounts.persistidos = await this.persistirParametrica(this.prisma.identityDocumentType, result.codigos);
              break;
            case 'tipo_punto_venta':
              persistCounts.persistidos = await this.persistirParametrica(this.prisma.pointSaleType, result.codigos);
              break;
            case 'tipo_documento_sector':
              persistCounts.persistidos = await this.persistirParametrica(this.prisma.sectorDocument, result.codigos);
              break;
            case 'actividades':
              persistCounts.persistidos = await this.persistirActividades(result.actividades);
              break;
            case 'productos_servicios':
              persistCounts.persistidos = await this.persistirProductos(result.productos);
              break;
            case 'actividades_documento_sector':
              persistCounts.persistidos = await this.persistirActividadesDocumentoSector(result.actividades);
              break;
            case 'leyendas_factura':
              persistCounts.persistidos = await this.persistirLeyendas(result.leyendas);
              break;
          }
          results[call.name] = { ...result, ...persistCounts };
        }
      } catch (err: any) {
        errors.push(`${call.name}: ${err.message}`);
      }
    }

    return {
      transaccion: errors.length === 0,
      mensaje: errors.length === 0 ? 'Todos los parámetros sincronizados correctamente' : `Errores: ${errors.join('; ')}`,
      resultados: results,
      errores: errors,
    };
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Post('cuis')
  async solicitarCuis(@Body() body: { point_sale_id?: number; branch_office_id?: number }) {
    const pointSaleId = Number(body.point_sale_id ?? 1);
    const branchOfficeId = Number(body.branch_office_id ?? 1);

    const cfg = await this.config.get();

    const pointSale = await this.prisma.pointSale.findUnique({ where: { id: pointSaleId } });
    const branchOffice = await this.prisma.branchOffice.findUnique({ where: { id: branchOfficeId } });

    if (!pointSale || !branchOffice) {
      throw new BadRequestException('Punto de venta o sucursal no encontrados');
    }

    const dateNow = new Date();

    const existingCuis = await this.prisma.cuis.findFirst({
      where: {
        pointSaleId,
        branchOfficeId,
        state: ENABLE,
        effectiveDate: { gte: dateNow },
      },
    });
    if (existingCuis) {
      throw new BadRequestException('Existe un CUIS vigente para este punto de venta');
    }

    let code: string;
    let fechaVigencia = new Date(Date.now() + 365 * 24 * 3600 * 1000);
    let transaction = true;

    if (!cfg.enabled) {
      code = (Math.floor(Math.random() * 0x7fffffff) + 0x10000000)
        .toString(16)
        .toUpperCase()
        .slice(0, 8);
    } else {
      const resp = await this.soap.solicitudCuis(cfg, {
        codigoPuntoVenta: pointSale.pointSaleCode,
        codigoSucursal: branchOffice.code,
      });

      if (!resp.fechaVigencia) {
        throw new BadRequestException(`El SIAT no devolvió fechaVigencia: ${JSON.stringify(resp)}`);
      }
      if (!resp.codigo) {
        throw new BadRequestException(`El SIAT no devolvió código: ${JSON.stringify(resp)}`);
      }

      code = resp.codigo ?? '';
      if (resp.fechaVigencia) fechaVigencia = new Date(resp.fechaVigencia);
      transaction = resp.transaccion || !!resp.codigo;
    }

    return this.prisma.cuis.create({
      data: {
        code,
        startDate: new Date(),
        effectiveDate: fechaVigencia,
        transaction,
        state: ENABLE,
        pointSaleId,
        branchOfficeId,
      },
    });
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Post('cufd')
  async solicitarCufd(
    @Body()
    body: {
      cuis_id?: number;
      point_sale_id?: number;
      branch_office_id?: number;
      codigo_punto_venta?: number;
    },
  ) {
    const cuisId = Number(body.cuis_id ?? 1);
    const pointSaleId = Number(body.point_sale_id ?? 1);
    const branchOfficeId = Number(body.branch_office_id ?? 1);

    const cuis = await this.prisma.cuis.findUnique({ where: { id: cuisId } });
    if (!cuis) throw new NotFoundException('CUIS no encontrado');

    const pointSale = await this.prisma.pointSale.findUnique({ where: { id: pointSaleId } });
    const branchOffice = await this.prisma.branchOffice.findUnique({ where: { id: branchOfficeId } });

    if (!pointSale || !branchOffice) {
      throw new BadRequestException('Punto de venta o sucursal no encontrados');
    }

    const dateNow = new Date();

    const existingCufd = await this.prisma.cufd.findFirst({
      where: {
        cuisId,
        pointSaleId,
        branchOfficeId,
        state: ENABLE,
        effectiveDate: { gte: dateNow },
      },
    });
    if (existingCufd) {
      throw new BadRequestException('Existe un CUFD vigente');
    }

    await this.prisma.cufd.updateMany({
      where: { cuisId, pointSaleId, branchOfficeId, state: ENABLE },
      data: { state: DISABLE, state2: DISABLE, state3: DISABLE },
    });

    const cfg = await this.config.get();
    let code: string;
    let controlCode = cuis.code;
    let address = '';
    let fechaVigencia = new Date(Date.now() + 24 * 3600 * 1000);
    let transaction = true;

    if (!cfg.enabled) {
      code = `CUF${Date.now().toString(16).toUpperCase()}`;
    } else {
      const resp = await this.soap.solicitudCufd(cfg, {
        codigoPuntoVenta: pointSale.pointSaleCode,
        codigoSucursal: branchOffice.code,
        cuis: cuis.code,
      });

      if (!resp.codigo && !resp.transaccion) {
        throw new BadRequestException(
          `El SIAT rechazó la solicitud de CUFD: ${descripcionErrores(resp.mensajes)}`,
        );
      }
      code = resp.codigo ?? '';
      controlCode = resp.codigoControl ?? cuis.code;
      address = resp.direccion ?? '';
      if (resp.fechaVigencia) fechaVigencia = new Date(resp.fechaVigencia);
      transaction = resp.transaccion || !!resp.codigo;
    }

    const carbonHour1 = new Date(fechaVigencia);
    carbonHour1.setDate(carbonHour1.getDate() - 1);

    const carbonHour2 = new Date(carbonHour1);
    carbonHour2.setHours(carbonHour2.getHours() + 72);

    const carbonHour3 = new Date(carbonHour1);
    carbonHour3.setDate(carbonHour3.getDate() + 15);

    return this.prisma.cufd.create({
      data: {
        code,
        controlCode,
        address: (address || branchOffice?.address) ?? '',
        startDate: carbonHour1,
        effectiveDate: fechaVigencia,
        effectiveDate2: carbonHour2,
        effectiveDate3: carbonHour3,
        transaction,
        state: ENABLE,
        state2: ENABLE,
        state3: ENABLE,
        cuisId,
        pointSaleId,
        branchOfficeId,
      },
    });
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Delete('cuis/:id')
  async anularCuis(@Param('id') id: string) {
    const cuis = await this.prisma.cuis.findUnique({ where: { id: Number(id) } });
    if (!cuis) throw new NotFoundException('CUIS no encontrado');
    return this.prisma.cuis.update({
      where: { id: Number(id) },
      data: { state: DISABLE },
    });
  }

  @CheckAbility({ action: Action.Manage, subject: 'Siat' })
  @Delete('cufd/:id')
  async anularCufd(@Param('id') id: string) {
    const cufd = await this.prisma.cufd.findUnique({ where: { id: Number(id) } });
    if (!cufd) throw new NotFoundException('CUFD no encontrado');
    return this.prisma.cufd.update({
      where: { id: Number(id) },
      data: { state: DISABLE, state2: DISABLE, state3: DISABLE },
    });
  }

  private async persistirParametrica(
    delegate: any,
    codigos: any[],
  ): Promise<{ creados: number; actualizados: number }> {
    let creados = 0;
    let actualizados = 0;
    for (const codigo of codigos || []) {
      const classifierCode = String(codigo.codigoClasificador ?? '');
      const descripcion = String(codigo.descripcion ?? '');
      if (!classifierCode || !descripcion) continue;
      const existente = await delegate.findFirst({ where: { classifierCode } });
      if (existente) {
        await delegate.update({
          where: { id: existente.id },
          data: { description: descripcion, state: ENABLE },
        });
        actualizados++;
      } else {
        await delegate.create({
          data: { classifierCode, description: descripcion, state: ENABLE },
        });
        creados++;
      }
    }
    return { creados, actualizados };
  }

  private async persistirActividades(actividades: any[]): Promise<{ creados: number; actualizados: number }> {
    let creados = 0;
    let actualizados = 0;
    for (const act of actividades || []) {
      const caebCode = String(act.codigoCaeb ?? '');
      const descripcion = String(act.descripcion ?? '');
      const activityType = String(act.tipoActividad ?? '');
      if (!caebCode || !descripcion) continue;
      const existente = await this.prisma.activity.findFirst({ where: { caebCode } });
      if (existente) {
        await this.prisma.activity.update({
          where: { id: existente.id },
          data: { description: descripcion, activityType, state: ENABLE },
        });
        actualizados++;
      } else {
        await this.prisma.activity.create({
          data: { caebCode, description: descripcion, activityType, state: ENABLE },
        });
        creados++;
      }
    }
    return { creados, actualizados };
  }

  private async persistirProductos(productos: any[]): Promise<{ creados: number; actualizados: number }> {
    let creados = 0;
    let actualizados = 0;
    for (const prod of productos || []) {
      const activityCode = String(prod.codigoActividad ?? '');
      const productCode = String(prod.codigoProducto ?? '');
      const productDescription = String(prod.descripcionProducto ?? '');
      if (!activityCode || !productCode || !productDescription) continue;
      const activity = await this.prisma.activity.findFirst({ where: { caebCode: activityCode } });
      if (!activity) continue;
      const existente = await this.prisma.productsServices.findFirst({
        where: { productCode, activityCode },
      });
      if (existente) {
        await this.prisma.productsServices.update({
          where: { id: existente.id },
          data: { productDescription, state: ENABLE },
        });
        actualizados++;
      } else {
        await this.prisma.productsServices.create({
          data: { activityCode, productCode, productDescription, activityId: activity.id, state: ENABLE },
        });
        creados++;
      }
    }
    return { creados, actualizados };
  }

  private async persistirLeyendas(leyendas: any[]): Promise<{ creados: number; actualizados: number }> {
    let creados = 0;
    let actualizados = 0;
    for (const ley of leyendas || []) {
      const activityCode = String(ley.codigoActividad ?? '');
      const legendDescription = String(ley.descripcionLeyenda ?? '');
      if (!activityCode || !legendDescription) continue;
      const activity = await this.prisma.activity.findFirst({ where: { caebCode: activityCode } });
      if (!activity) continue;
      const existente = await this.prisma.legend.findFirst({
        where: { activityCode, legendDescription },
      });
      if (existente) {
        await this.prisma.legend.update({
          where: { id: existente.id },
          data: { state: ENABLE },
        });
        actualizados++;
      } else {
        await this.prisma.legend.create({
          data: { activityCode, legendDescription, activityId: activity.id, state: ENABLE },
        });
        creados++;
      }
    }
    return { creados, actualizados };
  }

  private async persistirActividadesDocumentoSector(
    actividades: any[],
  ): Promise<{ creados: number; actualizados: number }> {
    let creados = 0;
    let actualizados = 0;
    for (const act of actividades || []) {
      const activityCode = String(act.codigoActividad ?? '');
      const sectorDocumentCode = String(act.codigoDocumentoSector ?? '');
      const sectorDocumentType = String(act.tipoDocumentoSector ?? '');
      if (!activityCode || !sectorDocumentCode || !sectorDocumentType) continue;
      const activity = await this.prisma.activity.findFirst({ where: { caebCode: activityCode } });
      if (!activity) continue;
      const sectorDocument = await this.prisma.sectorDocument.findFirst({
        where: { classifierCode: sectorDocumentCode },
      });
      if (!sectorDocument) continue;
      const existente = await this.prisma.sectorDocumentActivity.findFirst({
        where: { activityCode, sectorDocumentCode },
      });
      if (existente) {
        await this.prisma.sectorDocumentActivity.update({
          where: { id: existente.id },
          data: { sectorDocumentType, state: ENABLE },
        });
        actualizados++;
      } else {
        await this.prisma.sectorDocumentActivity.create({
          data: {
            activityCode,
            sectorDocumentCode,
            sectorDocumentType,
            activityId: activity.id,
            sectorDocumentId: sectorDocument.id,
            state: ENABLE,
          },
        });
        creados++;
      }
    }
    return { creados, actualizados };
  }
}
