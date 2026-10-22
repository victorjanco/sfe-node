import { describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicePackageReceptionService } from './invoice-package-reception.service';

type FakeSignificantEvent = {
  id: number;
  number: string;
  code: string | null;
  reasonEventCode: string | null;
  branchOfficeCode: string;
  pointSaleCode: string;
  state: number;
};

type FakeInvoicePackageReception = {
  id: number;
  number: number;
  descriptionCode: string | null;
  stateCode: string | null;
  receptionCode: string | null;
  transaction: boolean;
  amount: number | null;
  state: number;
  significantEventId: number;
};

type FakeValidation = {
  id: number;
  descriptionCode: string | null;
  stateCode: string | null;
  receptionCode: string | null;
  transaction: boolean;
  state: number;
  significantEventId: number;
  receiptPackageInvoiceId: number;
};

type DbState = {
  significantEvents: FakeSignificantEvent[];
  invoicePackageReceptions: FakeInvoicePackageReception[];
  validations: FakeValidation[];
  nextId: number;
};

function createFakeDb(): DbState {
  return {
    significantEvents: [
      { id: 1, number: '1', code: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', state: 1 },
      { id: 2, number: '2', code: null, reasonEventCode: '1', branchOfficeCode: '1', pointSaleCode: '1', state: 1 },
    ],
    invoicePackageReceptions: [],
    validations: [],
    nextId: 10,
  };
}

function buildPrisma(db: DbState) {
  return {
    significantEvent: {
      findUnique: async ({ where }: any) => db.significantEvents.find((e) => e.id === where.id) ?? null,
    },
    invoicePackageReception: {
      findMany: async ({ where, orderBy, take }: any) => {
        let items = [...db.invoicePackageReceptions];
        if (where?.significantEventId !== undefined) items = items.filter((r) => r.significantEventId === where.significantEventId);
        if (orderBy?.id === 'desc') items.reverse();
        if (orderBy?.number === 'asc') items.sort((a, b) => a.number - b.number);
        if (take) items = items.slice(0, take);
        return items;
      },
      findUnique: async ({ where }: any) => db.invoicePackageReceptions.find((r) => r.id === where.id) ?? null,
      create: async ({ data }: any) => {
        const record: FakeInvoicePackageReception = { id: db.nextId++, ...data, state: data.state ?? 1 };
        db.invoicePackageReceptions.push(record);
        return record;
      },
      update: async ({ where, data }: any) => {
        const idx = db.invoicePackageReceptions.findIndex((r) => r.id === where.id);
        if (idx === -1) throw new Error('not found');
        db.invoicePackageReceptions[idx] = { ...db.invoicePackageReceptions[idx], ...data };
        return db.invoicePackageReceptions[idx];
      },
    },
    validationInvoicePackageReception: {
      create: async ({ data }: any) => {
        const record: FakeValidation = { id: db.nextId++, ...data, state: data.state ?? 1 };
        db.validations.push(record);
        return record;
      },
    },
  };
}

function makeService(db: DbState): InvoicePackageReceptionService {
  const prisma = buildPrisma(db) as never;
  return new InvoicePackageReceptionService(prisma);
}

describe('InvoicePackageReceptionService', () => {
  describe('findAll', () => {
    it('retorna todos los paquetes', async () => {
      const db = createFakeDb();
      db.invoicePackageReceptions = [
        { id: 1, number: 1, descriptionCode: 'OK', stateCode: '906', receptionCode: 'REC001', transaction: true, amount: 5, state: 1, significantEventId: 1 },
      ];
      const service = makeService(db);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].receptionCode).toBe('REC001');
    });
  });

  describe('findById', () => {
    it('retorna paquete por id', async () => {
      const db = createFakeDb();
      db.invoicePackageReceptions = [
        { id: 5, number: 1, descriptionCode: null, stateCode: null, receptionCode: null, transaction: false, amount: null, state: 1, significantEventId: 1 },
      ];
      const service = makeService(db);
      const result = await service.findById(5);
      expect(result.id).toBe(5);
    });

    it('lanza NotFoundException si no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(service.findById(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findBySignificantEvent', () => {
    it('retorna paquetes de un evento significativo', async () => {
      const db = createFakeDb();
      db.invoicePackageReceptions = [
        { id: 1, number: 1, descriptionCode: null, stateCode: null, receptionCode: null, transaction: true, amount: 10, state: 1, significantEventId: 1 },
        { id: 2, number: 1, descriptionCode: null, stateCode: null, receptionCode: null, transaction: true, amount: 5, state: 1, significantEventId: 2 },
      ];
      const service = makeService(db);
      const result = await service.findBySignificantEvent(1);
      expect(result).toHaveLength(1);
      expect(result[0].significantEventId).toBe(1);
    });
  });

  describe('create', () => {
    it('crea un paquete de recepción válido', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      const result = await service.create({
        significantEventId: 1,
        descriptionCode: 'Creado exitosamente',
        stateCode: '906',
        receptionCode: 'REC-001',
        transaction: true,
        amount: 10,
      });
      expect(result.id).toBeDefined();
      expect(result.number).toBe(1);
      expect(result.transaction).toBe(true);
      expect(result.amount).toBe(10);
    });

    it('incrementa el número del paquete', async () => {
      const db = createFakeDb();
      db.invoicePackageReceptions = [
        { id: 1, number: 3, descriptionCode: null, stateCode: null, receptionCode: null, transaction: true, amount: 5, state: 1, significantEventId: 1 },
      ];
      const service = makeService(db);
      const result = await service.create({
        significantEventId: 1,
        transaction: true,
        amount: 8,
      });
      expect(result.number).toBe(4);
    });

    it('lanza error si significantEventId falta', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ significantEventId: 0, transaction: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si significantEvent no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ significantEventId: 999, transaction: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('createValidation', () => {
    it('crea una validación válida', async () => {
      const db = createFakeDb();
      db.invoicePackageReceptions = [
        { id: 1, number: 1, descriptionCode: null, stateCode: null, receptionCode: 'REC-001', transaction: true, amount: 10, state: 1, significantEventId: 1 },
      ];
      const service = makeService(db);
      const result = await service.createValidation({
        receiptPackageInvoiceId: 1,
        significantEventId: 1,
        descriptionCode: 'Validado',
        stateCode: '907',
        receptionCode: 'VAL-001',
        transaction: true,
      });
      expect(result.id).toBeDefined();
      expect(result.transaction).toBe(true);
    });

    it('lanza error si receiptPackageInvoiceId falta', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.createValidation({ receiptPackageInvoiceId: 0, significantEventId: 1, transaction: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si paquete no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.createValidation({ receiptPackageInvoiceId: 999, significantEventId: 1, transaction: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si significantEvent no existe', async () => {
      const db = createFakeDb();
      db.invoicePackageReceptions = [
        { id: 1, number: 1, descriptionCode: null, stateCode: null, receptionCode: null, transaction: true, amount: 5, state: 1, significantEventId: 1 },
      ];
      const service = makeService(db);
      await expect(
        service.createValidation({ receiptPackageInvoiceId: 1, significantEventId: 999, transaction: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('marca paquete como inactivo (soft delete)', async () => {
      const db = createFakeDb();
      db.invoicePackageReceptions = [
        { id: 1, number: 1, descriptionCode: null, stateCode: null, receptionCode: null, transaction: true, amount: 5, state: 1, significantEventId: 1 },
      ];
      const service = makeService(db);
      await service.remove(1);
      expect(db.invoicePackageReceptions[0].state).toBe(0);
    });

    it('lanza error si paquete no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(service.remove(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
