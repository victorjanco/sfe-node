import { describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContingencyService } from './contingency.service';

type FakeContingency = {
  id: number;
  number: number;
  cafc: string;
  amount: number;
  effectiveDate: Date;
  state: number;
  activityId: number;
  sectorDocumentId: number;
  branchOfficeId: number;
};

type DbState = {
  contingencies: FakeContingency[];
  activities: { id: number; description: string; caebCode: string; state: number }[];
  sectorDocuments: { id: number; classifierCode: string; description: string; state: number }[];
  branchOffices: { id: number; code: number; name: string; nit: string }[];
  nextId: number;
};

function createFakeDb(): DbState {
  return {
    contingencies: [],
    activities: [
      { id: 1, description: 'VENTA AL POR MENOR', caebCode: '47890', state: 1 },
      { id: 2, description: 'SERVICIOS DE CONSULTORIA', caebCode: '70200', state: 1 },
    ],
    sectorDocuments: [
      { id: 1, classifierCode: '1', description: 'FACTURA COMPRA VENTA', state: 1 },
      { id: 2, classifierCode: '2', description: 'FACTURA SERVICIOS', state: 1 },
    ],
    branchOffices: [
      { id: 1, code: 1, name: 'SUCURSAL PRINCIPAL', nit: '123456789' },
      { id: 2, code: 2, name: 'SUCURSAL SECUNDARIA', nit: '987654321' },
    ],
    nextId: 10,
  };
}

function buildPrisma(db: DbState) {
  return {
    contingency: {
      findMany: async ({ where, orderBy, take, include }: any) => {
        let items = [...db.contingencies];
        if (where?.state !== undefined) items = items.filter((c) => c.state === where.state);
        if (where?.branchOfficeId !== undefined) items = items.filter((c) => c.branchOfficeId === where.branchOfficeId);
        if (orderBy?.id === 'desc') items.reverse();
        if (orderBy?.number === 'desc') items.sort((a, b) => b.number - a.number);
        if (take) items = items.slice(0, take);
        if (include) {
          return items.map((c) => ({
            ...c,
            activity: db.activities.find((a) => a.id === c.activityId) ?? null,
            sectorDocument: db.sectorDocuments.find((s) => s.id === c.sectorDocumentId) ?? null,
            branchOffice: db.branchOffices.find((b) => b.id === c.branchOfficeId) ?? null,
          }));
        }
        return items;
      },
      findUnique: async ({ where, include }: any) => {
        const item = db.contingencies.find((c) => c.id === where.id);
        if (!item) return null;
        if (include) {
          return {
            ...item,
            activity: db.activities.find((a) => a.id === item.activityId) ?? null,
            sectorDocument: db.sectorDocuments.find((s) => s.id === item.sectorDocumentId) ?? null,
            branchOffice: db.branchOffices.find((b) => b.id === item.branchOfficeId) ?? null,
          };
        }
        return item;
      },
      create: async ({ data }: any) => {
        const item: FakeContingency = { id: db.nextId++, ...data, state: 1 };
        db.contingencies.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const idx = db.contingencies.findIndex((c) => c.id === where.id);
        if (idx === -1) throw new Error('contingency not found');
        db.contingencies[idx] = { ...db.contingencies[idx], ...data };
        return db.contingencies[idx];
      },
    },
    activity: {
      findUnique: async ({ where }: any) => db.activities.find((a) => a.id === where.id) ?? null,
    },
    sectorDocument: {
      findUnique: async ({ where }: any) => db.sectorDocuments.find((s) => s.id === where.id) ?? null,
    },
    branchOffice: {
      findUnique: async ({ where }: any) => db.branchOffices.find((b) => b.id === where.id) ?? null,
    },
  };
}

function makeService(db: DbState): ContingencyService {
  const prisma = buildPrisma(db) as never;
  return new ContingencyService(prisma);
}

describe('ContingencyService', () => {
  describe('findAll', () => {
    it('retorna todas las contingencias con relaciones', async () => {
      const db = createFakeDb();
      db.contingencies = [
        { id: 1, number: 1, cafc: 'ABC-123', amount: 500, effectiveDate: new Date('2025-12-31'), state: 1, activityId: 1, sectorDocumentId: 1, branchOfficeId: 1 },
      ];
      const service = makeService(db);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].activity?.description).toBe('VENTA AL POR MENOR');
      expect(result[0].branchOffice?.name).toBe('SUCURSAL PRINCIPAL');
    });
  });

  describe('findById', () => {
    it('retorna contingencia por id', async () => {
      const db = createFakeDb();
      db.contingencies = [
        { id: 5, number: 1, cafc: 'XYZ-789', amount: 1000, effectiveDate: new Date('2025-12-31'), state: 1, activityId: 1, sectorDocumentId: 1, branchOfficeId: 1 },
      ];
      const service = makeService(db);
      const result = await service.findById(5);
      expect(result.id).toBe(5);
      expect(result.cafc).toBe('XYZ-789');
    });

    it('lanza NotFoundException si no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(service.findById(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findEnabled', () => {
    it('solo retorna contingencias con state=1', async () => {
      const db = createFakeDb();
      db.contingencies = [
        { id: 1, number: 1, cafc: 'A', amount: 100, effectiveDate: new Date(), state: 1, activityId: 1, sectorDocumentId: 1, branchOfficeId: 1 },
        { id: 2, number: 2, cafc: 'B', amount: 200, effectiveDate: new Date(), state: 0, activityId: 1, sectorDocumentId: 1, branchOfficeId: 1 },
      ];
      const service = makeService(db);
      const result = await service.findEnabled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('create', () => {
    it('crea contingencia con datos válidos', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      const result = await service.create({
        cafc: 'CAFC-001',
        amount: 500,
        effectiveDate: '2025-12-31',
        activityId: 1,
        sectorDocumentId: 1,
        branchOfficeId: 1,
      });
      expect(result.id).toBeDefined();
      expect(result.number).toBe(1);
      expect(result.cafc).toBe('CAFC-001');
      expect(result.amount).toBe(500);
      expect(result.state).toBe(1);
    });

    it('incrementa el número por sucursal', async () => {
      const db = createFakeDb();
      db.contingencies = [
        { id: 1, number: 5, cafc: 'A', amount: 100, effectiveDate: new Date(), state: 1, activityId: 1, sectorDocumentId: 1, branchOfficeId: 1 },
      ];
      const service = makeService(db);
      const result = await service.create({
        cafc: 'CAFC-002',
        amount: 200,
        effectiveDate: '2025-12-31',
        activityId: 1,
        sectorDocumentId: 1,
        branchOfficeId: 1,
      });
      expect(result.number).toBe(6);
    });

    it('lanza error si cafc falta', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ cafc: '', amount: 100, effectiveDate: '2025-12-31', activityId: 1, sectorDocumentId: 1, branchOfficeId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si amount falta', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ cafc: 'X', amount: 0, effectiveDate: '2025-12-31', activityId: 1, sectorDocumentId: 1, branchOfficeId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si effectiveDate falta', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ cafc: 'X', amount: 100, effectiveDate: '', activityId: 1, sectorDocumentId: 1, branchOfficeId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si activityId falta', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ cafc: 'X', amount: 100, effectiveDate: '2025-12-31', activityId: 0, sectorDocumentId: 1, branchOfficeId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si sectorDocumentId falta', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ cafc: 'X', amount: 100, effectiveDate: '2025-12-31', activityId: 1, sectorDocumentId: 0, branchOfficeId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si branchOfficeId falta', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ cafc: 'X', amount: 100, effectiveDate: '2025-12-31', activityId: 1, sectorDocumentId: 1, branchOfficeId: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si activity no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ cafc: 'X', amount: 100, effectiveDate: '2025-12-31', activityId: 999, sectorDocumentId: 1, branchOfficeId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si sectorDocument no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ cafc: 'X', amount: 100, effectiveDate: '2025-12-31', activityId: 1, sectorDocumentId: 999, branchOfficeId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si branchOffice no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ cafc: 'X', amount: 100, effectiveDate: '2025-12-31', activityId: 1, sectorDocumentId: 1, branchOfficeId: 999 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('actualiza cafc y amount', async () => {
      const db = createFakeDb();
      db.contingencies = [
        { id: 1, number: 1, cafc: 'OLD', amount: 100, effectiveDate: new Date('2025-01-01'), state: 1, activityId: 1, sectorDocumentId: 1, branchOfficeId: 1 },
      ];
      const service = makeService(db);
      const result = await service.update(1, { cafc: 'NEW', amount: 999 });
      expect(result.cafc).toBe('NEW');
      expect(result.amount).toBe(999);
    });

    it('lanza NotFoundException si no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(service.update(999, { cafc: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('marca contingencia como inactiva (soft delete)', async () => {
      const db = createFakeDb();
      db.contingencies = [
        { id: 1, number: 1, cafc: 'A', amount: 100, effectiveDate: new Date(), state: 1, activityId: 1, sectorDocumentId: 1, branchOfficeId: 1 },
      ];
      const service = makeService(db);
      const result = await service.remove(1);
      expect(result.message).toBe('Contingencia deshabilitada');
      expect(db.contingencies[0].state).toBe(0);
    });

    it('lanza NotFoundException si no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(service.remove(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
