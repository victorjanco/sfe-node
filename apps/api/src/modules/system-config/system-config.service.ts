import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SiatConfigService } from '../siat/siat-config.service';

@Injectable()
export class SystemConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siatConfig: SiatConfigService,
  ) {}

  async getOverview() {
    const [
      companies,
      branchOffices,
      pointSales,
      tokens,
      customers,
      products,
      warehouses,
      users,
      roles,
      permissions,
      salesCount,
      invoicesCount,
      lastSale,
      lastInvoice,
      siat,
    ] = await Promise.all([
      this.prisma.company.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.branchOffice.findMany({
        include: { pointSales: true, cuiss: true, cufds: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.pointSale.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.token.findMany({ orderBy: { id: 'desc' } }),
      this.prisma.customer.count(),
      this.prisma.product.count({ where: { state: 1 } }),
      this.prisma.warehouse.count(),
      this.prisma.user.findMany({
        include: {
          userRoles: {
            include: {
              role: {
                include: { rolePermissions: { include: { permission: true } } },
              },
            },
          },
          userPermissions: { include: { permission: true } },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.role.findMany({
        include: { rolePermissions: { include: { permission: true } } },
      }),
      this.prisma.permission.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.sale.count(),
      this.prisma.invoice.count(),
      this.prisma.sale.findFirst({
        orderBy: { id: 'desc' },
        include: { customer: true, branchOffice: true },
      }),
      this.prisma.invoice.findFirst({
        orderBy: { id: 'desc' },
        include: { customer: true, branchOffice: true, pointSale: true },
      }),
      this.siatConfig.get(),
    ]);

    const inventoryValue = await this.prisma.inventory.aggregate({
      where: { state: 1 },
      _sum: { quantity: true, unitCost: true },
    });

    return {
      company: companies[0] ?? null,
      companies,
      branchOffices,
      pointSales,
      tokens,
      stats: {
        customers,
        products,
        warehouses,
        salesCount,
        invoicesCount,
        inventoryQty: inventoryValue._sum.quantity ?? 0,
      },
      lastSale,
      lastInvoice,
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        isActive: u.isActive,
        createdAt: u.createdAt,
        roles: u.userRoles.map((ur) => ur.role.name),
        permissions: [
          ...new Set([
            ...u.userPermissions.map((up) => up.permission.name),
            ...u.userRoles.flatMap((ur) =>
              ur.role.rolePermissions.map((rp) => rp.permission.name),
            ),
          ]),
        ],
      })),
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isActive: r.isActive,
        permissions: r.rolePermissions.map((rp) => rp.permission.name),
      })),
      permissions,
      siat: {
        enabled: siat.enabled,
        baseUrl: siat.baseUrl,
        codigoAmbiente: siat.codigoAmbiente,
        codigoModalidad: siat.codigoModalidad,
        codigoSistema: siat.codigoSistema,
        nit: siat.nit,
        codigoSucursal: siat.codigoSucursal,
        codigoPuntoVenta: siat.codigoPuntoVenta,
        hasPrivateKey: Boolean(siat.privateKey),
        hasPublicKey: Boolean(siat.publicKey),
        hasToken: Boolean(siat.token),
      },
      env: {
        SIAT_ENABLED: process.env.SIAT_ENABLED ?? null,
        SIAT_BASE_URL: process.env.SIAT_BASE_URL ?? null,
        SIAT_AMBIENTE: process.env.SIAT_AMBIENTE ?? null,
        SIAT_MODALIDAD: process.env.SIAT_MODALIDAD ?? null,
        DATABASE_PROVIDER: (process.env.DATABASE_URL ?? '').split(':')[0] ?? null,
        JWT_SECRET_SET: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-super-secret-jwt-key-change-in-production'),
      },
    };
  }

  async updateCompany(body: any) {
    const { id, ...data } = body;
    return this.prisma.company.update({ where: { id: Number(id) }, data });
  }

  async updateBranchOffice(body: any) {
    const { id, ...data } = body;
    return this.prisma.branchOffice.update({ where: { id: Number(id) }, data });
  }

  async updatePointSale(body: any) {
    const { id, ...data } = body;
    return this.prisma.pointSale.update({ where: { id: Number(id) }, data });
  }

  async upsertToken(body: any) {
    const { id, ...data } = body;
    if (id) {
      return this.prisma.token.update({
        where: { id: Number(id) },
        data: {
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        },
      });
    }
    const company = await this.prisma.company.findFirst({ where: { state: 1 } });
    return this.prisma.token.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        companyId: data.companyId ?? company?.id,
        state: data.state ?? 1,
      },
    });
  }
}
