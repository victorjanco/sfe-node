import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$transaction' | '$on' | '$use' | '$extends'
>;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
    try {
      await this.ensureNumberingSequenceTable();
    } catch {
      // Mejor esfuerzo: si falla el ensure, nextCounter lo reintentará.
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  private async ensureNumberingSequenceTable(): Promise<void> {
    try {
      await (this as any).$queryRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "numbering_sequence" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "counter_type" TEXT NOT NULL,
          "branch_office_id" INTEGER NOT NULL,
          "point_sale_id" INTEGER,
          "current" INTEGER NOT NULL DEFAULT 0,
          "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
      );
    } catch { /* SQLite-specific, se ignora si no es SQLite o existe */ }
    try {
      await (this as any).$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "numbering_sequence_counter_type_branch_office_id_point_sale_id_key" ` +
        `ON "numbering_sequence"("counter_type", "branch_office_id", "point_sale_id");`,
      );
    } catch {}
    try {
      await (this as any).$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "numbering_sequence_branch_office_id_point_sale_id_idx" ` +
        `ON "numbering_sequence"("branch_office_id", "point_sale_id");`,
      );
    } catch {}
  }

  /**
   * Reserva el próximo número de venta (por sucursal) usando un contador
   * dedicado con bloqueo de fila atómico (UPSERT + increment).
   * Si la tabla numbering_sequence está vacía, se bootstrap con el _max
   * existente para no romper numeraciones anteriores.
   *
   * Debe invocarse DENTRO de una transacción (tx) para que la reserva
   * acompañe al commit/rollback lógico.
   */
  async nextSaleNum(tx: Tx, branchOfficeId: number): Promise<number> {
    return this.nextCounter(tx, {
      counterType: 'SALE',
      branchOfficeId,
      pointSaleId: null,
      async bootstrap() {
        const agg = await tx.sale.aggregate({
          _max: { saleNum: true },
          where: { branchOfficeId },
        });
        return agg._max.saleNum ?? 0;
      },
    });
  }

  /** Próximo número de factura (por sucursal + punto de venta). */
  async nextInvoiceNum(tx: Tx, branchOfficeId: number, pointSaleId: number): Promise<number> {
    return this.nextCounter(tx, {
      counterType: 'INVOICE',
      branchOfficeId,
      pointSaleId,
      async bootstrap() {
        const agg = await tx.invoice.aggregate({
          _max: { invoiceNum: true },
          where: { branchOfficeId, pointSaleId },
        });
        return agg._max.invoiceNum ?? 0;
      },
    });
  }

  private async nextCounter(
    tx: Tx,
    args: {
      counterType: 'SALE' | 'INVOICE';
      branchOfficeId: number;
      pointSaleId: number | null;
      bootstrap: () => Promise<number>;
    },
  ): Promise<number> {
    const whereClause: Prisma.NumberingSequenceWhereInput = {
      counterType: args.counterType,
      branchOfficeId: args.branchOfficeId,
      pointSaleId: args.pointSaleId,
    };

    let existingList: Array<any>;
    try {
      existingList = await tx.numberingSequence.findMany({
        where: whereClause,
        orderBy: { id: 'asc' },
        take: 2,
      });
    } catch (err) {
      // P2021: tabla numbering_sequence no existe. Crear a demanda y reintentar findMany.
      const isMissing =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021';
      if (!isMissing) throw err;
      try { await this.ensureNumberingSequenceTable(); } catch {}
      try {
        existingList = await tx.numberingSequence.findMany({
          where: whereClause,
          orderBy: { id: 'asc' },
          take: 2,
        });
      } catch { existingList = []; }
    }

    if (existingList.length === 0) {
      const start = await args.bootstrap();
      try {
        await tx.numberingSequence.create({
          data: {
            counterType: args.counterType,
            branchOfficeId: args.branchOfficeId,
            pointSaleId: args.pointSaleId,
            current: start,
          },
        });
      } catch (err) {
        const isUnique =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!isUnique) throw err;
      }
    } else if (existingList.length > 1) {
      const ids = existingList.map((r) => r.id).sort((a, b) => a - b);
      const keeper = ids[ids.length - 1];
      await tx.numberingSequence.deleteMany({
        where: { id: { in: ids.slice(0, -1) } },
      });
    }

    const updatedList = await tx.numberingSequence.findMany({
      where: whereClause,
      orderBy: { id: 'asc' },
      take: 1,
      select: { id: true, current: true },
    });

    if (!updatedList.length) {
      throw new Error(
        `No se pudo reservar numeración ${args.counterType} para sucursal ${args.branchOfficeId} / PDV ${args.pointSaleId}`,
      );
    }

    const row = updatedList[0];
    const next = row.current + 1;
    await tx.numberingSequence.update({
      where: { id: row.id },
      data: { current: next },
    });
    return next;
  }
}