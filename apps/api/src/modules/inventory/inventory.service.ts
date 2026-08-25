import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  InventoryEntryDto,
  InventoryExitDto,
  WarehouseDto,
  WithdrawForSaleDto,
} from './dto/inventory.dto';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Tx) {
    return tx ?? this.prisma;
  }

  // -------------------------------------------------------------------------
  // Almacenes
  // -------------------------------------------------------------------------

  async listWarehouses() {
    return this.prisma.warehouse.findMany({
      where: { state: 1 },
      include: { branchOffice: true },
      orderBy: { id: 'asc' },
    });
  }

  async createWarehouse(dto: WarehouseDto) {
    const branchOffice = await this.prisma.branchOffice.findFirst({
      where: { id: dto.branchOfficeId, state: 1 },
    });
    if (!branchOffice) throw new NotFoundException('Sucursal no encontrada');
    return this.prisma.warehouse.create({ data: { ...dto, state: 1 } });
  }

  async updateWarehouse(id: number, dto: Partial<WarehouseDto>) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException('Almacén no encontrado');
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  async disableWarehouse(id: number) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException('Almacén no encontrado');
    return this.prisma.warehouse.update({ where: { id }, data: { state: 2 } });
  }

  // -------------------------------------------------------------------------
  // Stock y kardex
  // -------------------------------------------------------------------------

  async stock(warehouseId?: number, search?: string) {
    return this.prisma.inventory.findMany({
      where: {
        state: 1,
        ...(warehouseId ? { warehouseId } : {}),
        ...(search
          ? {
              product: {
                OR: [
                  { code: { contains: search } },
                  { tradename: { contains: search } },
                  { genericName: { contains: search } },
                ],
              },
            }
          : {}),
      },
      include: { product: { include: { unitMeasure: true } }, warehouse: true },
      orderBy: [{ productId: 'asc' }, { warehouseId: 'asc' }],
    });
  }

  async balance(opts: {
    from?: Date;
    to?: Date;
    warehouseId?: number;
    productId?: number;
  }) {
    const { from, to, warehouseId, productId } = opts;

    const baseWhere: Record<string, unknown> = { state: 1 };
    if (warehouseId) baseWhere.warehouseId = warehouseId;
    if (productId) baseWhere.productId = productId;

    let beforeRows: Array<{
      movementType: string;
      quantity: unknown;
      unitCost: unknown;
      productId: number;
      warehouseId: number;
    }> = [];
    if (from) {
      beforeRows = await this.prisma.inventoryMovement.findMany({
        where: { ...baseWhere, createdAt: { lt: from } },
      });
    }

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;
    const rangeRows = await this.prisma.inventoryMovement.findMany({
      where: {
        ...baseWhere,
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
    });

    const key = (productId: number, warehouseId: number) =>
      `${productId}:${warehouseId}`;

    const groups = new Map<
      string,
      { initialQty: number; initialValue: number; entriesQty: number; entriesValue: number; exitsQty: number; exitsValue: number }
    >();
    const getGroup = (productId: number, warehouseId: number) => {
      const k = key(productId, warehouseId);
      let g = groups.get(k);
      if (!g) {
        g = { initialQty: 0, initialValue: 0, entriesQty: 0, entriesValue: 0, exitsQty: 0, exitsValue: 0 };
        groups.set(k, g);
      }
      return { k, g };
    };

    for (const m of beforeRows) {
      const { g } = getGroup(m.productId, m.warehouseId);
      const qty = toNum(m.quantity);
      const value = round2(qty * toNum(m.unitCost));
      if (m.movementType === 'IN') {
        g.initialQty = round2(g.initialQty + qty);
        g.initialValue = round2(g.initialValue + value);
      } else {
        g.initialQty = round2(g.initialQty - qty);
        g.initialValue = round2(g.initialValue - value);
      }
    }

    for (const m of rangeRows) {
      const { g } = getGroup(m.productId, m.warehouseId);
      const qty = toNum(m.quantity);
      const value = round2(qty * toNum(m.unitCost));
      if (m.movementType === 'IN') {
        g.entriesQty = round2(g.entriesQty + qty);
        g.entriesValue = round2(g.entriesValue + value);
      } else {
        g.exitsQty = round2(g.exitsQty + qty);
        g.exitsValue = round2(g.exitsValue + value);
      }
    }

    const productIds = [...new Set([...groups.keys()].map((k) => Number(k.split(':')[0])))];
    const warehouseIds = [...new Set([...groups.keys()].map((k) => Number(k.split(':')[1])))];
    const [products, warehouses] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { unitMeasure: true },
      }),
      this.prisma.warehouse.findMany({ where: { id: { in: warehouseIds } } }),
    ]);
    const productMap = new Map(products.map((p) => [p.id, p]));
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    return [...groups.entries()]
      .map(([k, g]) => {
        const [pid, wid] = k.split(':').map(Number);
        const product = productMap.get(pid);
        const warehouse = warehouseMap.get(wid);
        if (!product || !warehouse) return null;
        const finalQty = round2(g.initialQty + g.entriesQty - g.exitsQty);
        const finalValue = round2(g.initialValue + g.entriesValue - g.exitsValue);
        return {
          product,
          warehouse,
          initialQty: g.initialQty,
          initialValue: g.initialValue,
          entriesQty: g.entriesQty,
          entriesValue: g.entriesValue,
          exitsQty: g.exitsQty,
          exitsValue: g.exitsValue,
          finalQty,
          finalValue,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => {
        const code = a.product.code.localeCompare(b.product.code);
        return code !== 0 ? code : a.warehouse.id - b.warehouse.id;
      });
  }

  async stockMinimo() {
    const rows = await this.prisma.inventory.findMany({
      where: { state: 1 },
      include: { product: true, warehouse: true },
      orderBy: { productId: 'asc' },
    });
    return rows.filter((r) => toNum(r.quantity) <= toNum(r.product.minimumStock));
  }

  async kardex(productId?: number, warehouseId?: number) {
    return this.prisma.inventoryMovement.findMany({
      where: {
        state: 1,
        ...(productId ? { productId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: {
        product: true,
        warehouse: true,
        user: { select: { username: true } },
      },
      orderBy: { id: 'desc' },
      take: 500,
    });
  }

  // -------------------------------------------------------------------------
  // Entradas de inventario (IN)
  // -------------------------------------------------------------------------

  async registerEntry(dto: InventoryEntryDto, userId: number) {
    if (!dto.details?.length) throw new BadRequestException('Debe enviar al menos un detalle');

    return this.prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findFirst({ where: { id: dto.warehouseId, state: 1 } });
      if (!warehouse) throw new NotFoundException('Almacén no encontrado');

      const entry = await tx.inventoryEntry.create({
        data: {
          entryType: dto.entryType,
          reference: dto.reference ?? null,
          warehouseId: warehouse.id,
          userId,
          total: 0,
        },
      });

      let total = 0;
      const detailRows = [];
      for (const d of dto.details) {
        const product = await tx.product.findUnique({ where: { id: d.productId } });
        if (!product) throw new NotFoundException(`Producto ${d.productId} no encontrado`);

        const unitMeasureId = d.unitMeasureId ?? product.unitMeasureId;
        const inventory = await tx.inventory.upsert({
          where: {
            productId_warehouseId: { productId: product.id, warehouseId: warehouse.id },
          },
          update: {},
          create: { productId: product.id, warehouseId: warehouse.id, quantity: 0, availableQuantity: 0, unitCost: 0, state: 1 },
        });

        const currentQty = toNum(inventory.quantity);
        const currentCost = toNum(inventory.unitCost);
        const qty = round2(toNum(d.quantity));
        const cost = round2(toNum(d.costPrice));
        const newQty = round2(currentQty + qty);
        const newCost = newQty > 0 ? round2((currentQty * currentCost + qty * cost) / newQty) : cost;

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: newQty, availableQuantity: newQty, unitCost: newCost },
        });
        await tx.inventoryMovement.create({
          data: {
            movementType: 'IN',
            quantity: qty,
            unitCost: cost,
            stockAfter: newQty,
            referenceType: 'ENTRY',
            referenceId: entry.id,
            productId: product.id,
            warehouseId: warehouse.id,
            userId,
          },
        });

        const lineTotal = round2(qty * cost);
        total = round2(total + lineTotal);
        detailRows.push({
          quantity: qty,
          costPrice: cost,
          state: 1,
          entryId: entry.id,
          productId: product.id,
          unitMeasureId,
        });
      }

      await tx.inventoryEntryDetail.createMany({ data: detailRows });
      await tx.inventoryEntry.update({ where: { id: entry.id }, data: { total } });

      return { entry: await tx.inventoryEntry.findUnique({ where: { id: entry.id }, include: { details: true } }) };
    });
  }

  async listEntries(opts: { warehouseId?: number; from?: Date; to?: Date }) {
    const dateFilter: Record<string, Date> = {};
    if (opts.from) dateFilter.gte = opts.from;
    if (opts.to) dateFilter.lte = opts.to;

    return this.prisma.inventoryEntry.findMany({
      where: {
        ...(opts.warehouseId ? { warehouseId: opts.warehouseId } : {}),
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
      include: {
        warehouse: true,
        user: { select: { username: true } },
        _count: { select: { details: true } },
      },
      orderBy: { id: 'desc' },
      take: 200,
    });
  }

  async getEntry(id: number) {
    const entry = await this.prisma.inventoryEntry.findUnique({
      where: { id },
      include: {
        warehouse: true,
        user: { select: { username: true } },
        details: { include: { product: true, unitMeasure: true } },
      },
    });
    if (!entry) throw new NotFoundException(`Ingreso ${id} no encontrado`);
    return entry;
  }

  async annulEntry(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.inventoryEntry.findUnique({
        where: { id },
        include: { details: true },
      });
      if (!entry) throw new NotFoundException(`Ingreso ${id} no encontrado`);
      if (entry.state === 0) throw new BadRequestException('El ingreso ya está anulado');

      for (const d of entry.details) {
        if (d.state !== 1) continue;
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_warehouseId: { productId: d.productId, warehouseId: entry.warehouseId },
          },
        });
        const available = inventory ? toNum(inventory.quantity) : 0;
        if (available < toNum(d.quantity)) {
          const product = await tx.product.findUnique({ where: { id: d.productId } });
          throw new BadRequestException(
            `No se puede anular: stock insuficiente para revertir "${product?.tradename ?? d.productId}" (disponible ${available}, por revertir ${toNum(d.quantity)})`,
          );
        }
      }

      for (const d of entry.details) {
        if (d.state !== 1) continue;
        await tx.inventory.updateMany({
          where: { productId: d.productId, warehouseId: entry.warehouseId, state: 1 },
          data: {
            quantity: { decrement: toNum(d.quantity) },
            availableQuantity: { decrement: toNum(d.quantity) },
          },
        });
      }

      await tx.inventoryEntryDetail.updateMany({ where: { entryId: id }, data: { state: 0 } });
      await tx.inventoryMovement.updateMany({
        where: { referenceType: 'ENTRY', referenceId: id },
        data: { state: 0 },
      });

      return tx.inventoryEntry.update({ where: { id }, data: { state: 0 } });
    });
  }

  // -------------------------------------------------------------------------
  // Salidas de inventario (OUT)
  // -------------------------------------------------------------------------

  private async validateStock(tx: Tx, productId: number, warehouseId: number, quantity: number) {
    const inventory = await tx.inventory.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });
    if (!inventory) {
      throw new BadRequestException(`No hay stock registrado para el producto ${productId} en el almacén ${warehouseId}`);
    }
    const available = toNum(inventory.quantity);
    if (available < quantity) {
      throw new BadRequestException(
        `Stock insuficiente: disponible ${available}, requerido ${quantity}`,
      );
    }
    return inventory;
  }

  private async applyExit(
    tx: Tx,
    opts: {
      exitType: string;
      reference: string | null;
      warehouseId: number;
      saleId?: number | null;
      userId: number;
      details: Array<{ productId: number; quantity: number; unitMeasureId?: number }>;
    },
  ) {
    const exit = await tx.inventoryExit.create({
      data: {
        exitType: opts.exitType,
        reference: opts.reference,
        warehouseId: opts.warehouseId,
        saleId: opts.saleId ?? null,
        userId: opts.userId,
        total: 0,
      },
    });

    const grouped = new Map<number, { quantity: number; unitMeasureId?: number }>();
    for (const d of opts.details) {
      const prev = grouped.get(d.productId) ?? { quantity: 0 };
      prev.quantity = round2(prev.quantity + toNum(d.quantity));
      if (!prev.unitMeasureId) prev.unitMeasureId = d.unitMeasureId;
      grouped.set(d.productId, prev);
    }

    let total = 0;
    const detailRows = [];
    for (const [productId, g] of grouped) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) continue;
      if (!product.isStockControlled) continue;

      const unitMeasureId = g.unitMeasureId ?? product.unitMeasureId;
      const inventory = await this.validateStock(tx, productId, opts.warehouseId, g.quantity);
      const unitCost = toNum(inventory.unitCost);
      const newQty = round2(toNum(inventory.quantity) - g.quantity);

      const updated = await tx.inventory.updateMany({
        where: { id: inventory.id, quantity: { gte: g.quantity }, state: 1 },
        data: {
          quantity: { decrement: g.quantity },
          availableQuantity: { decrement: g.quantity },
        },
      });
      if (updated.count !== 1) {
        throw new BadRequestException(`Stock insuficiente para el producto ${product.tradename}`);
      }

      await tx.inventoryMovement.create({
        data: {
          movementType: 'OUT',
          quantity: g.quantity,
          unitCost,
          stockAfter: newQty,
          referenceType: opts.exitType === 'SALE' ? 'SALE' : 'EXIT',
          referenceId: exit.id,
          productId,
          warehouseId: opts.warehouseId,
          userId: opts.userId,
        },
      });

      total = round2(total + round2(g.quantity * unitCost));
      detailRows.push({
        quantity: g.quantity,
        costPrice: unitCost,
        state: 1,
        exitId: exit.id,
        productId,
        unitMeasureId,
      });
    }

    if (detailRows.length > 0) {
      await tx.inventoryExitDetail.createMany({ data: detailRows });
    }
    await tx.inventoryExit.update({ where: { id: exit.id }, data: { total } });

    return exit;
  }

  async registerExit(dto: InventoryExitDto, userId: number) {
    if (!dto.details?.length) throw new BadRequestException('Debe enviar al menos un detalle');

    return this.prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findFirst({ where: { id: dto.warehouseId, state: 1 } });
      if (!warehouse) throw new NotFoundException('Almacén no encontrado');

      const exit = await this.applyExit(tx, {
        exitType: dto.exitType,
        reference: dto.reference ?? null,
        warehouseId: warehouse.id,
        userId,
        details: dto.details,
      });

      return { exit: await tx.inventoryExit.findUnique({ where: { id: exit.id }, include: { details: true } }) };
    });
  }

  async listExits(opts: { warehouseId?: number; from?: Date; to?: Date }) {
    const dateFilter: Record<string, Date> = {};
    if (opts.from) dateFilter.gte = opts.from;
    if (opts.to) dateFilter.lte = opts.to;

    return this.prisma.inventoryExit.findMany({
      where: {
        ...(opts.warehouseId ? { warehouseId: opts.warehouseId } : {}),
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
      include: {
        warehouse: true,
        user: { select: { username: true } },
        _count: { select: { details: true } },
      },
      orderBy: { id: 'desc' },
      take: 200,
    });
  }

  async getExit(id: number) {
    const exit = await this.prisma.inventoryExit.findUnique({
      where: { id },
      include: {
        warehouse: true,
        user: { select: { username: true } },
        details: { include: { product: true, unitMeasure: true } },
      },
    });
    if (!exit) throw new NotFoundException(`Salida ${id} no encontrada`);
    return exit;
  }

  async annulExit(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const exit = await tx.inventoryExit.findUnique({
        where: { id },
        include: { details: true },
      });
      if (!exit) throw new NotFoundException(`Salida ${id} no encontrada`);
      if (exit.state === 0) throw new BadRequestException('La salida ya está anulada');
      if (exit.saleId) {
        throw new BadRequestException(
          'No se puede anular una salida generada por una venta; anule la venta en su lugar',
        );
      }

      for (const d of exit.details) {
        if (d.state !== 1) continue;
        await tx.inventory.upsert({
          where: {
            productId_warehouseId: { productId: d.productId, warehouseId: exit.warehouseId },
          },
          update: {
            quantity: { increment: toNum(d.quantity) },
            availableQuantity: { increment: toNum(d.quantity) },
          },
          create: {
            productId: d.productId,
            warehouseId: exit.warehouseId,
            quantity: toNum(d.quantity),
            availableQuantity: toNum(d.quantity),
            unitCost: toNum(d.costPrice),
            state: 1,
          },
        });
      }

      await tx.inventoryExitDetail.updateMany({ where: { exitId: id }, data: { state: 0 } });
      await tx.inventoryMovement.updateMany({
        where: { referenceType: 'EXIT', referenceId: id },
        data: { state: 0 },
      });

      return tx.inventoryExit.update({ where: { id }, data: { state: 0 } });
    });
  }

  // -------------------------------------------------------------------------
  // Integración con ventas (misma transacción)
  // -------------------------------------------------------------------------

  async resolveWarehouseForBranch(tx: Tx, branchOfficeId: number) {
    return tx.warehouse.findFirst({ where: { branchOfficeId, state: 1 } });
  }

  async validateStockForSale(tx: Tx, details: WithdrawForSaleDto['details'], warehouseId: number) {
    for (const d of details) {
      const product = await tx.product.findUnique({ where: { id: d.productId } });
      if (!product || !product.isStockControlled) continue;
      const inventory = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId: d.productId, warehouseId } },
      });
      const available = inventory ? toNum(inventory.quantity) : 0;
      if (available < toNum(d.quantity)) {
        throw new BadRequestException(
          `Stock insuficiente para ${product.tradename}: disponible ${available}, requerido ${toNum(d.quantity)}`,
        );
      }
    }
  }

  async withdrawForSale(tx: Tx, payload: WithdrawForSaleDto & { userId: number }) {
    return this.applyExit(tx, {
      exitType: 'SALE',
      reference: payload.reference ?? null,
      warehouseId: payload.warehouseId,
      saleId: payload.saleId ?? null,
      userId: payload.userId,
      details: payload.details,
    });
  }
}