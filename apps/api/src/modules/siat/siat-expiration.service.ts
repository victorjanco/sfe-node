import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ENABLE, DISABLE } from '../../common/siat.constants';

/**
 * Servicio de expiración automática de entidades SIAT.
 *
 * Port de Laravel `app/Traits/UpdateParams.php`.
 * Se ejecuta antes de cada operación de venta para garantizar que
 * TOKEN, CUIS, CUFD y CAFC estén vigentes.
 */
@Injectable()
export class SiatExpirationService {
  private readonly logger = new Logger(SiatExpirationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ejecuta todas las validaciones de expiración.
   * Llamar antes de cada venta o antes de operaciones críticas con SIAT.
   */
  async runAll(): Promise<void> {
    await this.expireTokens();
    await this.expireContingencies();
    await this.expireCuis();
    await this.expireCufds();
  }

  /**
   * Deshabilita tokens cuya fecha de fin ya pasó.
   * Laravel: actualizarEstadoTOKEN()
   */
  async expireTokens(): Promise<number> {
    const now = new Date();
    const expired = await this.prisma.token.findMany({
      where: { state: ENABLE, endDate: { not: null, lt: now } },
    });

    if (expired.length === 0) return 0;

    await this.prisma.token.updateMany({
      where: { id: { in: expired.map((t) => t.id) } },
      data: { state: DISABLE },
    });

    this.logger.warn(`Tokens expirados: ${expired.length}`);
    return expired.length;
  }

  /**
   * Deshabilita contingencias (CAFC) cuya fecha efectiva ya pasó.
   * Laravel: actualizarEstadoCAFC()
   */
  async expireContingencies(): Promise<number> {
    const now = new Date();
    const expired = await this.prisma.contingency.findMany({
      where: { state: ENABLE, effectiveDate: { lt: now } },
    });

    if (expired.length === 0) return 0;

    await this.prisma.contingency.updateMany({
      where: { id: { in: expired.map((c) => c.id) } },
      data: { state: DISABLE },
    });

    this.logger.warn(`Contingencias expiradas: ${expired.length}`);
    return expired.length;
  }

  /**
   * Deshabilita CUIS vencidos y cascada a sus CUFDs.
   * Laravel: actualizarEstadoCUIS() + caducarCufd()
   */
  async expireCuis(): Promise<number> {
    const now = new Date();
    const expired = await this.prisma.cuis.findMany({
      where: { state: ENABLE, effectiveDate: { lt: now } },
    });

    if (expired.length === 0) return 0;

    const ids = expired.map((c) => c.id);

    // Deshabilitar CUIS
    await this.prisma.cuis.updateMany({
      where: { id: { in: ids } },
      data: { state: DISABLE },
    });

    // Cascada: deshabilitar CUFDs asociados
    await this.prisma.cufd.updateMany({
      where: { cuisId: { in: ids }, state: ENABLE },
      data: { state: DISABLE, state2: DISABLE, state3: DISABLE },
    });

    this.logger.warn(`CUIS expirados: ${expired.length}, CUFDs cascada deshabilitados`);
    return expired.length;
  }

  /**
   * Deshabilita CUFDs vencidos en sus 3 estados y cierra eventos significativos.
   * Laravel: actualizarEstadoCUFD() + caducarEventoSignificativo()
   *
   * - state  → effectiveDate  (cierre normal)
   * - state2 → effectiveDate2 (cierre 72 hrs, reason_event_code ∈ [1,2])
   * - state3 → effectiveDate3 (cierre 15 días, reason_event_code ∈ [3,4])
   */
  async expireCufds(): Promise<number> {
    const now = new Date();
    let total = 0;

    // --- state: effectiveDate ---
    const expired1 = await this.prisma.cufd.findMany({
      where: { state: ENABLE, effectiveDate: { lt: now } },
    });
    if (expired1.length > 0) {
      await this.prisma.cufd.updateMany({
        where: { id: { in: expired1.map((c) => c.id) } },
        data: { state: DISABLE },
      });
      total += expired1.length;
    }

    // --- state2: effectiveDate2 (72 hrs) ---
    const expired2 = await this.prisma.cufd.findMany({
      where: { state2: ENABLE, effectiveDate2: { lt: now } },
    });
    if (expired2.length > 0) {
      await this.prisma.cufd.updateMany({
        where: { id: { in: expired2.map((c) => c.id) } },
        data: { state2: DISABLE },
      });

      // Cerrar eventos significativos de 72 hrs (reason_event_code ∈ [1,2])
      await this.closeSignificantEventsByReason(expired2.map((c) => c.id), ['1', '2']);
      total += expired2.length;
    }

    // --- state3: effectiveDate3 (15 días) ---
    const expired3 = await this.prisma.cufd.findMany({
      where: { state3: ENABLE, effectiveDate3: { lt: now } },
    });
    if (expired3.length > 0) {
      await this.prisma.cufd.updateMany({
        where: { id: { in: expired3.map((c) => c.id) } },
        data: { state3: DISABLE },
      });

      // Cerrar eventos significativos de 15 días (reason_event_code ∈ [3,4])
      await this.closeSignificantEventsByReason(expired3.map((c) => c.id), ['3', '4']);
      total += expired3.length;
    }

    if (total > 0) this.logger.warn(`CUFDs expirados: ${total}`);
    return total;
  }

  /**
   * Cierra eventos significativos asociados a CUFDs vencidos,
   * estableciendo endDate = effectiveDate del CUFD.
   * Laravel: caducarEventoSignificativo()
   */
  private async closeSignificantEventsByReason(
    cufdIds: number[],
    reasonCodes: string[],
  ): Promise<void> {
    if (cufdIds.length === 0) return;

    // Buscar CUFDs para obtener sus effectiveDates
    const cufds = await this.prisma.cufd.findMany({
      where: { id: { in: cufdIds } },
    });

    for (const cufd of cufds) {
      // Buscar eventos abiertos (endDate null) con reason_event_code en la lista
      // y que estén vinculados a este CUFD (cufd_event_id o cufd_event = code)
      const events = await this.prisma.significantEvent.findMany({
        where: {
          endDate: null,
          reasonEventCode: { in: reasonCodes },
          OR: [
            { cufdEventId: cufd.id },
            { cufdEvent: cufd.code },
          ],
        },
      });

      if (events.length > 0) {
        await this.prisma.significantEvent.updateMany({
          where: { id: { in: events.map((e) => e.id) } },
          data: { endDate: cufd.effectiveDate },
        });
        this.logger.warn(
          `Eventos significativos cerrados: ${events.length} (CUFD ${cufd.code}, reasons ${reasonCodes.join(',')})`,
        );
      }
    }
  }
}
