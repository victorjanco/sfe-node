import { describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SignificantEventService } from './significant-event.service';

type FakeSignificantEvent = {
  id: number;
  number: string;
  code: string | null;
  startDate: string;
  endDate: string;
  transaction: boolean;
  transactionReceipt: string | null;
  transactionValidation: string | null;
  cufdEvent: string | null;
  cufd: string | null;
  reasonEventCode: string | null;
  branchOfficeCode: string;
  pointSaleCode: string;
  reasonEventId: number;
  branchOfficeId: number;
  pointSaleId: number;
  sectorDocumentId: number | null;
  state: number;
  reasonEvent?: { id: number; classifierCode: string; description: string; state: number } | null;
};

type FakeInvoice = {
  id: number;
  invoiceDate: string;
  reasonEventCode: string | null;
  state: string;
  synchronizedSiat: number;
  urlXml?: string | null;
};

type DbState = {
  significantEvents: FakeSignificantEvent[];
  reasonEvents: { id: number; classifierCode: string; description: string; state: number }[];
  branchOffices: { id: number; code: number; name: string }[];
  pointSales: { id: number; branchOfficeId: number; pointSaleCode: number; pointSaleName: string; state: number }[];
  invoices: FakeInvoice[];
  contingencies: { id: number; cafc: string; state: number }[];
  significantEventContingencies: { id: number; significantEventId: number; contingencyId: number }[];
  significantEventInvoices: { id: number; state: number; synchronizedSiat: number; significantEventId: number; invoiceId: number }[];
  invoicePackageReceptions: { id: number; number: number; descriptionCode: string | null; stateCode: string | null; receptionCode: string | null; transaction: boolean; amount: number | null; state: number; significantEventId: number }[];
  validations: { id: number; descriptionCode: string | null; stateCode: string | null; receptionCode: string | null; transaction: boolean; state: number; significantEventId: number; receiptPackageInvoiceId: number }[];
  cuis: { id: number; code: string; state: number; branchOfficeId: number; pointSaleId: number }[];
  cufd: { id: number; code: string; state: number; branchOfficeId: number; pointSaleId: number }[];
  nextId: number;
  txInvoiceUpdates: { where: any; data: any }[];
  txSignificantEventInvoiceUpdates: { where: any; data: any }[];
};

function createFakeDb(): DbState {
  return {
    significantEvents: [],
    reasonEvents: [
      { id: 1, classifierCode: '9', description: 'CORTE DEL SERVICIO DE INTERNET', state: 1 },
      { id: 2, classifierCode: '1', description: 'VENTA EN LUGARES SIN INTERNET', state: 1 },
      { id: 3, classifierCode: '99', description: 'EVENTO DESHABILITADO', state: 0 },
    ],
    branchOffices: [
      { id: 1, code: 1, name: 'SUCURSAL PRINCIPAL' },
      { id: 2, code: 2, name: 'SUCURSAL SECUNDARIA' },
    ],
    pointSales: [
      { id: 1, branchOfficeId: 1, pointSaleCode: 1, pointSaleName: 'PV PRINCIPAL', state: 1 },
      { id: 2, branchOfficeId: 2, pointSaleCode: 1, pointSaleName: 'PV SECUNDARIO', state: 1 },
    ],
    invoices: [
      { id: 100, invoiceDate: '2025-01-15T10:00:00', reasonEventCode: '9', state: 'V', synchronizedSiat: 2 },
      { id: 101, invoiceDate: '2025-01-16T10:00:00', reasonEventCode: '9', state: 'V', synchronizedSiat: 2 },
      { id: 102, invoiceDate: '2025-01-17T10:00:00', reasonEventCode: '1', state: 'V', synchronizedSiat: 1 },
    ],
    contingencies: [
      { id: 1, cafc: 'ABC123DEF456G', state: 1 },
      { id: 2, cafc: 'XYZ789ABC012D', state: 1 },
    ],
    significantEventContingencies: [],
    significantEventInvoices: [],
    invoicePackageReceptions: [],
    validations: [],
    cuis: [
      { id: 1, code: 'CUIS-001', state: 1, branchOfficeId: 1, pointSaleId: 1 },
    ],
    cufd: [
      { id: 1, code: 'CUFD-NEW', state: 1, branchOfficeId: 1, pointSaleId: 1 },
    ],
    nextId: 10,
    txInvoiceUpdates: [],
    txSignificantEventInvoiceUpdates: [],
  };
}

function buildPrisma(db: DbState) {
  return {
    significantEvent: {
      findMany: async ({ where, orderBy, take, include }: any) => {
        let items = [...db.significantEvents];
        if (where?.state !== undefined) items = items.filter((e) => e.state === where.state);
        if (where?.pointSaleId !== undefined) items = items.filter((e) => e.pointSaleId === where.pointSaleId);
        if (orderBy?.id === 'asc') items.reverse();
        if (orderBy?.number === 'desc') items.sort((a, b) => Number(b.number) - Number(a.number));
        if (take) items = items.slice(0, take);
        return items.map((e) => ({
          ...e,
          reasonEvent: db.reasonEvents.find((r) => r.id === e.reasonEventId) ?? null,
          invoices: include?.invoices
            ? db.significantEventInvoices
                .filter((sei) => sei.significantEventId === e.id)
                .map((sei) => ({
                  ...sei,
                  invoice: db.invoices.find((i) => i.id === sei.invoiceId) ?? null,
                }))
            : undefined,
          packageReceptions: include?.packageReceptions
            ? db.invoicePackageReceptions
                .filter((p) => p.significantEventId === e.id)
                .map((p) => ({
                  ...p,
                  validations: [],
                }))
            : undefined,
        }));
      },
      findUnique: async ({ where, include }: any) => {
        const event = db.significantEvents.find((e) => e.id === where.id);
        if (!event) return null;
        return {
          ...event,
          reasonEvent: db.reasonEvents.find((r) => r.id === event.reasonEventId) ?? null,
          invoices: include?.invoices
            ? db.significantEventInvoices
                .filter((sei) => sei.significantEventId === event.id)
                .map((sei) => ({
                  ...sei,
                  invoice: db.invoices.find((i) => i.id === sei.invoiceId) ?? null,
                }))
            : undefined,
          packageReceptions: include?.packageReceptions
            ? db.invoicePackageReceptions
                .filter((p) => p.significantEventId === event.id)
                .map((p) => ({
                  ...p,
                  validations: [],
                }))
            : undefined,
        };
      },
      create: async ({ data }: any) => {
        const event: FakeSignificantEvent = { id: db.nextId++, ...data, state: 1 };
        db.significantEvents.push(event);
        return event;
      },
      update: async ({ where, data }: any) => {
        const idx = db.significantEvents.findIndex((e) => e.id === where.id);
        if (idx === -1) throw new Error('significantEvent not found');
        db.significantEvents[idx] = { ...db.significantEvents[idx], ...data };
        return db.significantEvents[idx];
      },
    },
    reasonEvent: {
      findUnique: async ({ where }: any) => db.reasonEvents.find((r) => r.id === where.id) ?? null,
      findFirst: async ({ where }: any) => db.reasonEvents.find((r) => where.classifierCode != null ? r.classifierCode === where.classifierCode : true) ?? null,
      findMany: async ({ where }: any) => {
        let items = [...db.reasonEvents];
        if (where?.state !== undefined) items = items.filter((r) => r.state === where.state);
        return items;
      },
    },
    branchOffice: {
      findUnique: async ({ where }: any) => db.branchOffices.find((b) => b.id === where.id) ?? null,
    },
    pointSale: {
      findFirst: async ({ where }: any) =>
        db.pointSales.find((p) => p.branchOfficeId === where.branchOfficeId && p.state === (where.state ?? 1)) ?? null,
    },
    invoice: {
      findMany: async ({ where }: any) => {
        let items = [...db.invoices];
        if (where?.id?.in) items = items.filter((i) => where.id.in.includes(i.id));
        return items;
      },
      findUnique: async ({ where }: any) => db.invoices.find((i) => i.id === where.id) ?? null,
      updateMany: async ({ where, data }: any) => {
        const ids = where.id?.in ?? [];
        let count = 0;
        for (const inv of db.invoices) {
          if (ids.includes(inv.id)) {
            Object.assign(inv, data);
            count++;
          }
        }
        db.txInvoiceUpdates.push({ where, data });
        return { count };
      },
    },
    contingency: {
      findUnique: async ({ where }: any) => db.contingencies.find((c) => c.id === where.id) ?? null,
      findMany: async ({ where }: any) => {
        let items = [...db.contingencies];
        if (where?.state !== undefined) items = items.filter((c) => c.state === where.state);
        return items;
      },
    },
    significantEventContingency: {
      create: async ({ data }: any) => {
        const record = { id: db.nextId++, ...data };
        db.significantEventContingencies.push(record);
        return record;
      },
    },
    significantEventInvoice: {
      findMany: async ({ where, orderBy, take }: any) => {
        let items = [...db.significantEventInvoices];
        if (where?.significantEventId !== undefined) items = items.filter((i) => i.significantEventId === where.significantEventId);
        if (where?.synchronizedSiat !== undefined) items = items.filter((i) => i.synchronizedSiat === where.synchronizedSiat);
        if (where?.id?.in) items = items.filter((i) => where.id.in.includes(i.id));
        if (orderBy?.invoiceId === 'asc') items.sort((a, b) => a.invoiceId - b.invoiceId);
        if (orderBy?.invoiceId === 'desc') items.sort((a, b) => b.invoiceId - a.invoiceId);
        if (take) items = items.slice(0, take);
        return items;
      },
      findFirst: async ({ where, orderBy }: any) => {
        let items = [...db.significantEventInvoices];
        if (where?.significantEventId !== undefined) items = items.filter((i) => i.significantEventId === where.significantEventId);
        if (orderBy?.invoiceId === 'desc') items.sort((a, b) => b.invoiceId - a.invoiceId);
        return items[0] ?? null;
      },
      upsert: async ({ where, create }: any) => {
        const existing = db.significantEventInvoices.find(
          (i) => i.significantEventId === where.significantEventId_invoiceId.significantEventId
            && i.invoiceId === where.significantEventId_invoiceId.invoiceId,
        );
        if (existing) return existing;
        const record = { id: db.nextId++, state: 1, synchronizedSiat: 2, ...create };
        db.significantEventInvoices.push(record);
        return record;
      },
      deleteMany: async ({ where }: any) => {
        const before = db.significantEventInvoices.length;
        db.significantEventInvoices = db.significantEventInvoices.filter(
          (i) => !(i.significantEventId === where.significantEventId && where.invoiceId.in.includes(i.invoiceId)),
        );
        return { count: before - db.significantEventInvoices.length };
      },
      updateMany: async ({ where, data }: any) => {
        const ids = where.id?.in ?? [];
        let count = 0;
        for (const link of db.significantEventInvoices) {
          if (ids.includes(link.id)) {
            Object.assign(link, data);
            count++;
          }
        }
        db.txSignificantEventInvoiceUpdates.push({ where, data });
        return { count };
      },
    },
    invoicePackageReception: {
      findMany: async ({ where, orderBy, take }: any) => {
        let items = [...db.invoicePackageReceptions];
        if (where?.significantEventId !== undefined) items = items.filter((r) => r.significantEventId === where.significantEventId);
        if (orderBy?.number === 'desc') items.sort((a, b) => b.number - a.number);
        if (take) items = items.slice(0, take);
        return items;
      },
      create: async ({ data }: any) => {
        const record = { id: db.nextId++, ...data, state: data.state ?? 1 };
        db.invoicePackageReceptions.push(record);
        return record;
      },
    },
    validationInvoicePackageReception: {
      create: async ({ data }: any) => {
        const record = { id: db.nextId++, ...data, state: data.state ?? 1 };
        db.validations.push(record);
        return record;
      },
    },
    cuis: {
      findFirst: async ({ where }: any) => {
        return db.cuis.find((c) => c.state === (where.state ?? 1) && c.branchOfficeId === where.branchOfficeId && c.pointSaleId === where.pointSaleId) ?? null;
      },
    },
    cufd: {
      findFirst: async ({ where, orderBy }: any) => {
        let items = [...db.cufd];
        if (where?.state !== undefined) items = items.filter((c) => c.state === where.state);
        if (where?.branchOfficeId !== undefined) items = items.filter((c) => c.branchOfficeId === where.branchOfficeId);
        if (where?.pointSaleId !== undefined) items = items.filter((c) => c.pointSaleId === where.pointSaleId);
        if (orderBy?.id === 'desc') items.sort((a, b) => b.id - a.id);
        return items[0] ?? null;
      },
    },
    $transaction: async (fnOrArray: any) => {
      if (Array.isArray(fnOrArray)) {
        return Promise.all(fnOrArray);
      }
      return fnOrArray(buildPrisma(db));
    },
  };
}

function makeService(db: DbState): SignificantEventService {
  const prisma = buildPrisma(db) as never;
  const mockSiatEmision = {
    registroEventoSignificativo: async () => ({ transaccion: true, codigoRecepcionEventoSignificativo: 'EVT-001' }),
    recepcionPaqueteFactura: async () => ({ transaccion: true, codigoEstado: 906, codigoRecepcion: 'REC-001' }),
    validacionRecepcionPaqueteFactura: async () => ({ transaccion: true, codigoEstado: 907, codigoRecepcion: 'VAL-001' }),
    prepararPaqueteFacturas: (xmls: string[]) => ({
      archivo: 'base64data',
      hashArchivo: 'sha256hash',
      cantidadFacturas: xmls.length,
    }),
  } as never;
  return new SignificantEventService(prisma, mockSiatEmision);
}

describe('SignificantEventService', () => {
  describe('findAll', () => {
    it('retorna todos los eventos con su reasonEvent', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      const service = makeService(db);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].reasonEvent?.description).toBe('CORTE DEL SERVICIO DE INTERNET');
    });

    it('incluye facturas vinculadas', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      db.significantEventInvoices = [
        { id: 1, state: 1, synchronizedSiat: 2, significantEventId: 1, invoiceId: 100 },
        { id: 2, state: 1, synchronizedSiat: 2, significantEventId: 1, invoiceId: 101 },
      ];
      const service = makeService(db);
      const result = await service.findAll();
      expect(result[0].invoices).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('retorna evento por id', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 5, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
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

  describe('findEnabled', () => {
    it('solo retorna eventos con state=1', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
        { id: 2, number: '2', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 0 },
      ];
      const service = makeService(db);
      const result = await service.findEnabled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('create', () => {
    it('crea un evento significativo con datos válidos', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      const result = await service.create({
        reasonEventId: 1,
        startDate: '2025-06-01T00:00:00',
        endDate: '2025-06-30T23:59:59',
        branchOfficeId: 1,
        pointSaleId: 1,
      });
      expect(result.id).toBeDefined();
      expect(result.number).toBe('1');
      expect(result.reasonEventCode).toBe('9');
      expect(result.branchOfficeCode).toBe('1');
      expect(result.state).toBe(1);
    });

    it('incrementa el número del evento', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '5', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      const service = makeService(db);
      const result = await service.create({
        reasonEventId: 1,
        startDate: '2025-06-01T00:00:00',
        endDate: '2025-06-30T23:59:59',
        branchOfficeId: 1,
        pointSaleId: 1,
      });
      expect(result.number).toBe('6');
    });

    it('lanza error si reasonEventId falta', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ reasonEventId: 0, startDate: '2025-06-01', endDate: '2025-06-30', branchOfficeId: 1, pointSaleId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si fechas faltan', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ reasonEventId: 1, startDate: '', endDate: '2025-06-30', branchOfficeId: 1, pointSaleId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si endDate <= startDate', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ reasonEventId: 1, startDate: '2025-06-30', endDate: '2025-06-01', branchOfficeId: 1, pointSaleId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si reasonEvent no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ reasonEventId: 999, startDate: '2025-06-01', endDate: '2025-06-30', branchOfficeId: 1, pointSaleId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si branchOffice no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ reasonEventId: 1, startDate: '2025-06-01', endDate: '2025-06-30', branchOfficeId: 999, pointSaleId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si punto de venta no encontrado para la sucursal', async () => {
      const db = createFakeDb();
      db.pointSales = [];
      const service = makeService(db);
      await expect(
        service.create({ reasonEventId: 1, startDate: '2025-06-01', endDate: '2025-06-30', branchOfficeId: 1, pointSaleId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crea evento con contingencyId y vincula', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      const result = await service.create({
        reasonEventId: 1,
        startDate: '2025-06-01T00:00:00',
        endDate: '2025-06-30T23:59:59',
        branchOfficeId: 1,
        pointSaleId: 1,
        contingencyId: 1,
      });
      expect(result.id).toBeDefined();
      expect(db.significantEventContingencies).toHaveLength(1);
      expect(db.significantEventContingencies[0].contingencyId).toBe(1);
    });

    it('lanza error si contingencyId no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(
        service.create({ reasonEventId: 1, startDate: '2025-06-01', endDate: '2025-06-30', branchOfficeId: 1, pointSaleId: 1, contingencyId: 999 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crea evento sin contingencyId', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      const result = await service.create({
        reasonEventId: 1,
        startDate: '2025-06-01T00:00:00',
        endDate: '2025-06-30T23:59:59',
        branchOfficeId: 1,
        pointSaleId: 1,
      });
      expect(result.id).toBeDefined();
      expect(db.significantEventContingencies).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('actualiza fechas y cufdEvent', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      const service = makeService(db);
      const result = await service.update(1, {
        startDate: '2025-07-01',
        endDate: '2025-07-31',
        cufdEvent: 'CUFD-001',
      });
      expect(result.startDate).toBe('2025-07-01');
      expect(result.endDate).toBe('2025-07-31');
      expect(result.cufdEvent).toBe('CUFD-001');
    });

    it('lanza error si endDate <= startDate en actualización', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      const service = makeService(db);
      await expect(
        service.update(1, { startDate: '2025-07-31', endDate: '2025-07-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si evento no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(service.update(999, { startDate: '2025-07-01' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('marca evento como inactivo (soft delete)', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      const service = makeService(db);
      await service.remove(1);
      expect(db.significantEvents[0].state).toBe(0);
    });

    it('lanza error si evento no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(service.remove(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getReasonEvents', () => {
    it('retorna solo reasonEvents habilitados', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      const result = await service.getReasonEvents();
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.state === 1)).toBe(true);
    });
  });

  describe('getContingencies', () => {
    it('retorna solo contingencies habilitadas', async () => {
      const db = createFakeDb();
      db.contingencies = [
        { id: 1, cafc: 'ABC123', state: 1 },
        { id: 2, cafc: 'XYZ789', state: 0 },
      ];
      const service = makeService(db);
      const result = await service.getContingencies();
      expect(result).toHaveLength(1);
      expect(result[0].cafc).toBe('ABC123');
    });
  });

  describe('linkInvoices', () => {
    it('vincula facturas a un evento', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      const service = makeService(db);
      const result = await service.linkInvoices(1, [100, 101]);
      expect(result.linked).toBe(2);
      expect(db.significantEventInvoices).toHaveLength(2);
    });

    it('lanza error si invoiceIds vacío', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      const service = makeService(db);
      await expect(service.linkInvoices(1, [])).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza error si factura no existe', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      const service = makeService(db);
      await expect(service.linkInvoices(1, [999])).rejects.toBeInstanceOf(BadRequestException);
    });

    it('no duplica vinculación existente (upsert)', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      db.significantEventInvoices = [
        { id: 1, state: 1, synchronizedSiat: 2, significantEventId: 1, invoiceId: 100 },
      ];
      const service = makeService(db);
      const result = await service.linkInvoices(1, [100]);
      expect(result.linked).toBe(1);
      expect(db.significantEventInvoices).toHaveLength(1);
    });
  });

  describe('unlinkInvoices', () => {
    it('desvincula facturas de un evento', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      db.significantEventInvoices = [
        { id: 1, state: 1, synchronizedSiat: 2, significantEventId: 1, invoiceId: 100 },
        { id: 2, state: 1, synchronizedSiat: 2, significantEventId: 1, invoiceId: 101 },
      ];
      const service = makeService(db);
      const result = await service.unlinkInvoices(1, [100]);
      expect(result.unlinked).toBe(1);
      expect(db.significantEventInvoices).toHaveLength(1);
      expect(db.significantEventInvoices[0].invoiceId).toBe(101);
    });

    it('lanza error si invoiceIds vacío', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: null, cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      const service = makeService(db);
      await expect(service.unlinkInvoices(1, [])).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('sendInvoiceSignificantEvent', () => {
    it('marca facturas pendientes del pivot como sincronizadas', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: 'EVT-001', startDate: '2025-01-01', endDate: '2025-01-31', transaction: true, transactionReceipt: null, transactionValidation: null, cufdEvent: 'CUFD-001', cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      db.significantEventInvoices = [
        { id: 1, state: 1, synchronizedSiat: 2, significantEventId: 1, invoiceId: 100 },
        { id: 2, state: 1, synchronizedSiat: 2, significantEventId: 1, invoiceId: 101 },
        { id: 3, state: 1, synchronizedSiat: 1, significantEventId: 1, invoiceId: 102 },
      ];
      db.invoices = [
        { id: 100, invoiceDate: '2025-01-15T10:00:00', reasonEventCode: '9', state: 'V', synchronizedSiat: 2, urlXml: 'facturas/1/100' },
        { id: 101, invoiceDate: '2025-01-16T10:00:00', reasonEventCode: '9', state: 'V', synchronizedSiat: 2, urlXml: 'facturas/1/101' },
        { id: 102, invoiceDate: '2025-01-17T10:00:00', reasonEventCode: '1', state: 'V', synchronizedSiat: 1, urlXml: 'facturas/1/102' },
      ];
      const service = makeService(db);
      const result = await service.sendInvoiceSignificantEvent(1);
      expect(result.transaccion).toBe(true);
      expect(result.mensaje).toContain('2 facturas sincronizadas');
      expect(result.codigos).toEqual([100, 101]);
    });

    it('retorna mensaje si no hay facturas pendientes en el pivot', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: 'EVT-001', startDate: '2025-01-01', endDate: '2025-01-31', transaction: true, transactionReceipt: null, transactionValidation: null, cufdEvent: 'CUFD-001', cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      db.significantEventInvoices = [
        { id: 1, state: 1, synchronizedSiat: 1, significantEventId: 1, invoiceId: 100 },
      ];
      db.invoices = [
        { id: 100, invoiceDate: '2025-01-15T10:00:00', reasonEventCode: '9', state: 'V', synchronizedSiat: 1 },
      ];
      const service = makeService(db);
      const result = await service.sendInvoiceSignificantEvent(1);
      expect(result.transaccion).toBe(true);
      expect(result.mensaje).toBe('No hay facturas pendientes de sincronización');
    });

    it('lanza error si evento no existe', async () => {
      const db = createFakeDb();
      const service = makeService(db);
      await expect(service.sendInvoiceSignificantEvent(999)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('actualiza synchronizedSiat en invoices y en el pivot', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: 'EVT-001', startDate: '2025-01-01', endDate: '2025-01-31', transaction: true, transactionReceipt: null, transactionValidation: null, cufdEvent: 'CUFD-001', cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      db.significantEventInvoices = [
        { id: 1, state: 1, synchronizedSiat: 2, significantEventId: 1, invoiceId: 100 },
      ];
      db.invoices = [
        { id: 100, invoiceDate: '2025-01-15T10:00:00', reasonEventCode: '9', state: 'V', synchronizedSiat: 2, urlXml: 'facturas/1/100' },
      ];
      const service = makeService(db);
      await service.sendInvoiceSignificantEvent(1);
      expect(db.invoices[0].synchronizedSiat).toBe(1);
      expect(db.significantEventInvoices[0].synchronizedSiat).toBe(1);
    });

    it('registra evento si no está registrado', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: null, startDate: '2025-01-01', endDate: '2025-01-31', transaction: false, transactionReceipt: null, transactionValidation: null, cufdEvent: 'CUFD-001', cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      db.significantEventInvoices = [
        { id: 1, state: 1, synchronizedSiat: 2, significantEventId: 1, invoiceId: 100 },
      ];
      db.invoices = [
        { id: 100, invoiceDate: '2025-01-15T10:00:00', reasonEventCode: '9', state: 'V', synchronizedSiat: 2, urlXml: 'facturas/1/100' },
      ];
      const service = makeService(db);
      const result = await service.sendInvoiceSignificantEvent(1);
      expect(result.transaccion).toBe(true);
      expect(db.significantEvents[0].transaction).toBe(true);
      expect(db.significantEvents[0].code).toBe('EVT-001');
    });

    it('crea InvoicePackageReception y validación', async () => {
      const db = createFakeDb();
      db.significantEvents = [
        { id: 1, number: '1', code: 'EVT-001', startDate: '2025-01-01', endDate: '2025-01-31', transaction: true, transactionReceipt: null, transactionValidation: null, cufdEvent: 'CUFD-001', cufd: null, reasonEventCode: '9', branchOfficeCode: '1', pointSaleCode: '1', reasonEventId: 1, branchOfficeId: 1, pointSaleId: 1, sectorDocumentId: null, state: 1 },
      ];
      db.significantEventInvoices = [
        { id: 1, state: 1, synchronizedSiat: 2, significantEventId: 1, invoiceId: 100 },
      ];
      db.invoices = [
        { id: 100, invoiceDate: '2025-01-15T10:00:00', reasonEventCode: '9', state: 'V', synchronizedSiat: 2, urlXml: 'facturas/1/100' },
      ];
      db.invoicePackageReceptions = [];
      db.validations = [];
      const service = makeService(db);
      await service.sendInvoiceSignificantEvent(1);
      expect(db.invoicePackageReceptions).toHaveLength(1);
      expect(db.invoicePackageReceptions[0].transaction).toBe(true);
      expect(db.invoicePackageReceptions[0].receptionCode).toBe('REC-001');
      expect(db.validations).toHaveLength(1);
      expect(db.validations[0].transaction).toBe(true);
    });
  });
});
