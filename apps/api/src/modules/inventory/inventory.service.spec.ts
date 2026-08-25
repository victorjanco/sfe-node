import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

type DbState = {
  inventories: Map<string, { id: number; quantity: number; availableQuantity: number; unitCost: number; state: number }>;
  products: Map<number, { id: number; tradename: string; isStockControlled: boolean; unitMeasureId: number }>;
  movements: Array<Record<string, unknown>>;
};

function createFakeDb(): DbState {
  return {
    inventories: new Map(),
    products: new Map([
      [1, { id: 1, tradename: 'LAPTOP DELL', isStockControlled: true, unitMeasureId: 28 }],
      [2, { id: 2, tradename: 'SERVICIO CONSULTORÍA', isStockControlled: false, unitMeasureId: 28 }],
    ]),
    movements: [],
  };
}

function buildTx(db: DbState) {
  return {
    product: {
      findUnique: async ({ where }: { where: { id: number } }) => db.products.get(where.id) ?? null,
    },
    inventory: {
      findUnique: async ({
        where,
      }: {
        where: { productId_warehouseId: { productId: number; warehouseId: number } };
      }) => {
        const key = `${where.productId_warehouseId.productId}:${where.productId_warehouseId.warehouseId}`;
        return db.inventories.get(key) ?? null;
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { productId_warehouseId: { productId: number; warehouseId: number } };
        create: { productId: number; warehouseId: number };
        update: Record<string, unknown>;
      }) => {
        const key = `${create.productId}:${create.warehouseId}`;
        const existing = db.inventories.get(key);
        if (existing) return { ...existing, ...update };
        const rec = { id: db.inventories.size + 1, ...create, quantity: 0, availableQuantity: 0, unitCost: 0, state: 1 };
        db.inventories.set(key, rec);
        return rec;
      },
      update: async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => {
        const rec = [...db.inventories.values()].find((i) => i.id === where.id);
        if (!rec) throw new Error('inventory not found');
        Object.assign(rec, data);
        return rec;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: number; quantity: { gte: number }; state?: number };
        data: { quantity: { decrement: number }; availableQuantity: { decrement: number } };
      }) => {
        const recs = [...db.inventories.values()].filter(
          (i) => i.id === where.id && i.state === 1 && i.quantity >= where.quantity.gte,
        );
        for (const r of recs) {
          r.quantity = Math.round((r.quantity - data.quantity.decrement) * 100) / 100;
          r.availableQuantity = Math.round((r.availableQuantity - data.availableQuantity.decrement) * 100) / 100;
        }
        return { count: recs.length };
      },
    },
    inventoryEntry: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data }),
      update: async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => ({ id: where.id, ...data }),
      findUnique: async ({ where }: { where: { id: number } }) => ({ id: where.id, details: [] }),
    },
    inventoryEntryDetail: {
      createMany: async () => ({ count: 0 }),
    },
    inventoryExit: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data }),
      update: async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => ({ id: where.id, ...data }),
      findUnique: async ({ where }: { where: { id: number } }) => ({ id: where.id, details: [] }),
    },
    inventoryExitDetail: {
      createMany: async () => ({ count: 0 }),
    },
    inventoryMovement: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        db.movements.push(data);
        return { id: db.movements.length, ...data };
      },
    },
    warehouse: {
      findFirst: async ({ where }: { where: { id: number; state?: number } }) =>
        where.id === 1 ? { id: 1, name: 'ALMACÉN PRINCIPAL', state: 1 } : null,
    },
  };
}

function makeService(db: DbState): InventoryService {
  const tx = buildTx(db);
  const prismaFake = {
    $transaction: async (fn: (t: unknown) => Promise<unknown>) => fn(tx),
  } as never;
  return new InventoryService(prismaFake);
}

describe('InventoryService', () => {
  describe('registerEntry — promedio ponderado', () => {
    it('registra el ingreso inicial y deja el costo igual al de la entrada', async () => {
      const db = createFakeDb();
      const service = makeService(db);

      await service.registerEntry(
        {
          entryType: 'INITIAL',
          reference: 'INICIAL',
          warehouseId: 1,
          details: [{ productId: 1, quantity: 50, costPrice: 4500 }],
        },
        1,
      );

      const inv = db.inventories.get('1:1');
      expect(inv?.quantity).toBe(50);
      expect(inv?.unitCost).toBe(4500);
      expect(db.movements[0].movementType).toBe('IN');
      expect(db.movements[0].stockAfter).toBe(50);
    });

    it('recalcula el promedio ponderado con la segunda entrada', async () => {
      const db = createFakeDb();
      const service = makeService(db);

      await service.registerEntry(
        { entryType: 'INITIAL', reference: 'A', warehouseId: 1, details: [{ productId: 1, quantity: 50, costPrice: 4500 }] },
        1,
      );
      await service.registerEntry(
        { entryType: 'PURCHASE', reference: 'B', warehouseId: 1, details: [{ productId: 1, quantity: 10, costPrice: 5000 }] },
        1,
      );

      const inv = db.inventories.get('1:1');
      expect(inv?.quantity).toBe(60);
      expect(inv?.unitCost).toBe(4583.33);
    });
  });

  describe('registerExit — no permite stock negativo', () => {
    it('descarta stock y mantiene el costo promedio', async () => {
      const db = createFakeDb();
      const service = makeService(db);

      await service.registerEntry(
        { entryType: 'INITIAL', reference: 'A', warehouseId: 1, details: [{ productId: 1, quantity: 100, costPrice: 1000 }] },
        1,
      );
      await service.registerExit(
        { exitType: 'ADJUSTMENT', reference: 'BAJA', warehouseId: 1, details: [{ productId: 1, quantity: 30 }] },
        1,
      );

      const inv = db.inventories.get('1:1');
      expect(inv?.quantity).toBe(70);
      expect(db.movements[1].movementType).toBe('OUT');
      expect(db.movements[1].stockAfter).toBe(70);
    });

    it('rechaza una salida mayor al stock disponible', async () => {
      const db = createFakeDb();
      const service = makeService(db);

      await service.registerEntry(
        { entryType: 'INITIAL', reference: 'A', warehouseId: 1, details: [{ productId: 1, quantity: 10, costPrice: 1000 }] },
        1,
      );

      await expect(
        service.registerExit(
          { exitType: 'ADJUSTMENT', reference: 'X', warehouseId: 1, details: [{ productId: 1, quantity: 999 }] },
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      const inv = db.inventories.get('1:1');
      expect(inv?.quantity).toBe(10);
    });
  });

  describe('withdrawForSale — integración con ventas', () => {
    it('descarta stock en la misma transacción de la venta', async () => {
      const db = createFakeDb();
      const service = makeService(db);

      await service.registerEntry(
        { entryType: 'INITIAL', reference: 'A', warehouseId: 1, details: [{ productId: 1, quantity: 50, costPrice: 4500 }] },
        1,
      );
      const tx = buildTx(db);
      const exit = await service.withdrawForSale(tx, {
        warehouseId: 1,
        saleId: 77,
        reference: 'VENTA #1',
        userId: 1,
        details: [{ productId: 1, quantity: 2 }],
      });

      const inv = db.inventories.get('1:1');
      expect(inv?.quantity).toBe(48);
      expect(exit.saleId).toBe(77);
      expect(db.movements[1].movementType).toBe('OUT');
      expect(db.movements[1].referenceType).toBe('SALE');
    });

    it('ignora productos/servicios no controlados por stock', async () => {
      const db = createFakeDb();
      const service = makeService(db);

      await service.registerEntry(
        { entryType: 'INITIAL', reference: 'A', warehouseId: 1, details: [{ productId: 1, quantity: 50, costPrice: 4500 }] },
        1,
      );
      const tx = buildTx(db);
      await service.withdrawForSale(tx, {
        warehouseId: 1,
        saleId: 78,
        reference: 'VENTA #2',
        userId: 1,
        details: [
          { productId: 1, quantity: 5 },
          { productId: 2, quantity: 3 },
        ],
      });

      const inv = db.inventories.get('1:1');
      expect(inv?.quantity).toBe(45);
    });

    it('rechaza la venta cuando el stock es insuficiente', async () => {
      const db = createFakeDb();
      const service = makeService(db);

      await service.registerEntry(
        { entryType: 'INITIAL', reference: 'A', warehouseId: 1, details: [{ productId: 1, quantity: 2, costPrice: 1000 }] },
        1,
      );
      const tx = buildTx(db);

      await expect(
        service.withdrawForSale(tx, {
          warehouseId: 1,
          saleId: 79,
          reference: 'VENTA #3',
          userId: 1,
          details: [{ productId: 1, quantity: 5 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});