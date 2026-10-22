import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoicePackageReceptionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.invoicePackageReception.findMany({
      include: {
        significantEvent: true,
        validations: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  async findById(id: number) {
    const reception = await this.prisma.invoicePackageReception.findUnique({
      where: { id },
      include: {
        significantEvent: true,
        validations: true,
      },
    });
    if (!reception) throw new NotFoundException('Paquete de recepción no encontrado');
    return reception;
  }

  async findBySignificantEvent(significantEventId: number) {
    return this.prisma.invoicePackageReception.findMany({
      where: { significantEventId },
      include: { validations: true },
      orderBy: { number: 'asc' },
    });
  }

  async create(dto: CreateInvoicePackageReceptionDto) {
    const { significantEventId, descriptionCode, stateCode, receptionCode, transaction, amount } = dto;

    if (!significantEventId) throw new BadRequestException('significantEventId es requerido');

    const event = await this.prisma.significantEvent.findUnique({ where: { id: significantEventId } });
    if (!event) throw new BadRequestException('significantEventId no existe');

    const maxNumberResult = await this.prisma.invoicePackageReception.findMany({
      where: { significantEventId },
      orderBy: { number: 'desc' },
      take: 1,
    });
    const maxNumber = maxNumberResult.length > 0 ? maxNumberResult[0].number : 0;

    return this.prisma.invoicePackageReception.create({
      data: {
        number: maxNumber + 1,
        descriptionCode: descriptionCode ?? null,
        stateCode: stateCode ?? null,
        receptionCode: receptionCode ?? null,
        transaction: transaction ?? false,
        amount: amount ?? null,
        significantEventId,
      },
    });
  }

  async createValidation(dto: CreateValidationDto) {
    const { receiptPackageInvoiceId, descriptionCode, stateCode, receptionCode, transaction, significantEventId } = dto;

    if (!receiptPackageInvoiceId) throw new BadRequestException('receiptPackageInvoiceId es requerido');
    if (!significantEventId) throw new BadRequestException('significantEventId es requerido');

    const reception = await this.prisma.invoicePackageReception.findUnique({ where: { id: receiptPackageInvoiceId } });
    if (!reception) throw new BadRequestException('receiptPackageInvoiceId no existe');

    const event = await this.prisma.significantEvent.findUnique({ where: { id: significantEventId } });
    if (!event) throw new BadRequestException('significantEventId no existe');

    return this.prisma.validationInvoicePackageReception.create({
      data: {
        descriptionCode: descriptionCode ?? null,
        stateCode: stateCode ?? null,
        receptionCode: receptionCode ?? null,
        transaction: transaction ?? false,
        significantEventId,
        receiptPackageInvoiceId,
      },
    });
  }

  async remove(id: number) {
    const reception = await this.findById(id);
    await this.prisma.invoicePackageReception.update({
      where: { id },
      data: { state: 0 },
    });
    return reception;
  }
}

interface CreateInvoicePackageReceptionDto {
  significantEventId: number;
  descriptionCode?: string;
  stateCode?: string;
  receptionCode?: string;
  transaction?: boolean;
  amount?: number;
}

interface CreateValidationDto {
  receiptPackageInvoiceId: number;
  significantEventId: number;
  descriptionCode?: string;
  stateCode?: string;
  receptionCode?: string;
  transaction?: boolean;
}
