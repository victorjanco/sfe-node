import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContingencyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.contingency.findMany({
      include: { activity: true, sectorDocument: true, branchOffice: true },
      orderBy: { id: 'desc' },
    });
  }

  async findById(id: number) {
    const item = await this.prisma.contingency.findUnique({
      where: { id },
      include: { activity: true, sectorDocument: true, branchOffice: true },
    });
    if (!item) throw new NotFoundException('Contingencia no encontrada');
    return item;
  }

  async findEnabled() {
    return this.prisma.contingency.findMany({
      where: { state: 1 },
      include: { activity: true, sectorDocument: true, branchOffice: true },
      orderBy: { id: 'desc' },
    });
  }

  async create(dto: CreateContingencyDto) {
    const { cafc, amount, effectiveDate, activityId, sectorDocumentId, branchOfficeId } = dto;

    if (!cafc) throw new BadRequestException('cafc es requerido');
    if (!amount) throw new BadRequestException('amount es requerido');
    if (!effectiveDate) throw new BadRequestException('effectiveDate es requerido');
    if (!activityId) throw new BadRequestException('activityId es requerido');
    if (!sectorDocumentId) throw new BadRequestException('sectorDocumentId es requerido');
    if (!branchOfficeId) throw new BadRequestException('branchOfficeId es requerido');

    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new BadRequestException('activityId no existe');

    const sectorDocument = await this.prisma.sectorDocument.findUnique({ where: { id: sectorDocumentId } });
    if (!sectorDocument) throw new BadRequestException('sectorDocumentId no existe');

    const branchOffice = await this.prisma.branchOffice.findUnique({ where: { id: branchOfficeId } });
    if (!branchOffice) throw new BadRequestException('branchOfficeId no existe');

    const maxNumberResult = await this.prisma.contingency.findMany({
      where: { branchOfficeId },
      orderBy: { number: 'desc' },
      take: 1,
    });
    const maxNumber = maxNumberResult.length > 0 ? maxNumberResult[0].number : 0;

    return this.prisma.contingency.create({
      data: {
        number: maxNumber + 1,
        cafc,
        amount,
        effectiveDate: new Date(effectiveDate),
        activityId,
        sectorDocumentId,
        branchOfficeId,
      },
    });
  }

  async update(id: number, dto: UpdateContingencyDto) {
    await this.findById(id);
    const { cafc, amount, effectiveDate, activityId, sectorDocumentId, branchOfficeId } = dto;

    return this.prisma.contingency.update({
      where: { id },
      data: {
        ...(cafc !== undefined && { cafc }),
        ...(amount !== undefined && { amount }),
        ...(effectiveDate !== undefined && { effectiveDate: new Date(effectiveDate) }),
        ...(activityId !== undefined && { activityId }),
        ...(sectorDocumentId !== undefined && { sectorDocumentId }),
        ...(branchOfficeId !== undefined && { branchOfficeId }),
      },
    });
  }

  async remove(id: number) {
    await this.findById(id);
    await this.prisma.contingency.update({
      where: { id },
      data: { state: 0 },
    });
    return { message: 'Contingencia deshabilitada' };
  }
}

interface CreateContingencyDto {
  cafc: string;
  amount: number;
  effectiveDate: string;
  activityId: number;
  sectorDocumentId: number;
  branchOfficeId: number;
}

interface UpdateContingencyDto {
  cafc?: string;
  amount?: number;
  effectiveDate?: string;
  activityId?: number;
  sectorDocumentId?: number;
  branchOfficeId?: number;
}
