import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: require('path').resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Users
  { name: 'users.read', description: 'Ver usuarios', module: 'users', action: 'read' },
  { name: 'users.create', description: 'Crear usuarios', module: 'users', action: 'create' },
  { name: 'users.update', description: 'Actualizar usuarios', module: 'users', action: 'update' },
  { name: 'users.delete', description: 'Eliminar usuarios', module: 'users', action: 'delete' },

  // Roles
  { name: 'roles.read', description: 'Ver roles', module: 'roles', action: 'read' },
  { name: 'roles.create', description: 'Crear roles', module: 'roles', action: 'create' },
  { name: 'roles.update', description: 'Actualizar roles', module: 'roles', action: 'update' },
  { name: 'roles.delete', description: 'Eliminar roles', module: 'roles', action: 'delete' },

  // Permissions
  { name: 'permissions.read', description: 'Ver permisos', module: 'permissions', action: 'read' },
  { name: 'permissions.create', description: 'Crear permisos', module: 'permissions', action: 'create' },
  { name: 'permissions.update', description: 'Actualizar permisos', module: 'permissions', action: 'update' },
  { name: 'permissions.delete', description: 'Eliminar permisos', module: 'permissions', action: 'delete' },

  // Sales
  { name: 'sales.read', description: 'Ver ventas', module: 'sales', action: 'read' },
  { name: 'sales.create', description: 'Crear ventas', module: 'sales', action: 'create' },
  { name: 'sales.update', description: 'Actualizar ventas', module: 'sales', action: 'update' },
  { name: 'sales.delete', description: 'Eliminar ventas', module: 'sales', action: 'delete' },

  // Inventory (nivel módulo — usados por el menú y el backend)
  { name: 'inventory.read', description: 'Ver inventario (stock, kardex, balance)', module: 'inventory', action: 'read' },
  { name: 'inventory.create', description: 'Registrar ingresos y salidas de inventario', module: 'inventory', action: 'create' },
  { name: 'inventory.manage', description: 'Gestionar almacenes', module: 'inventory', action: 'manage' },

  // Inventory entries (granulares de ingresos)
  { name: 'inventory_entries.read', description: 'Listar y ver ingresos de inventario', module: 'inventory_entries', action: 'read' },
  { name: 'inventory_entries.create', description: 'Registrar ingresos de inventario', module: 'inventory_entries', action: 'create' },
  { name: 'inventory_entries.update', description: 'Modificar ingresos de inventario', module: 'inventory_entries', action: 'update' },
  { name: 'inventory_entries.delete', description: 'Anular ingresos de inventario', module: 'inventory_entries', action: 'delete' },

  // Inventory exits (granulares de salidas)
  { name: 'inventory_exits.read', description: 'Listar y ver salidas de inventario', module: 'inventory_exits', action: 'read' },
  { name: 'inventory_exits.create', description: 'Registrar salidas de inventario', module: 'inventory_exits', action: 'create' },
  { name: 'inventory_exits.update', description: 'Modificar salidas de inventario', module: 'inventory_exits', action: 'update' },
  { name: 'inventory_exits.delete', description: 'Anular salidas de inventario', module: 'inventory_exits', action: 'delete' },

  // Inventory granular
  { name: 'inventory_entry', description: 'Permiso de ingreso de inventario', module: 'inventory', action: 'inventory_entry' },
  { name: 'inventory_exit', description: 'Permiso de salida de inventario', module: 'inventory', action: 'inventory_exit' },

  // Warehouses (granulares de almacenes)
  { name: 'warehouse.read', description: 'Ver almacenes', module: 'warehouse', action: 'read' },
  { name: 'warehouse.create', description: 'Crear almacenes', module: 'warehouse', action: 'create' },
  { name: 'warehouse.update', description: 'Modificar almacenes', module: 'warehouse', action: 'update' },
  { name: 'warehouse.delete', description: 'Eliminar/deshabilitar almacenes', module: 'warehouse', action: 'delete' },

  // Note-sales
  { name: 'note_sales.read', description: 'Permiso de lectura de notas de venta', module: 'note_sales', action: 'note_sales.read' },
  { name: 'note_sales.manage', description: 'Permiso de creación/edición de notas de venta', module: 'note_sales', action: 'note_sales.manage' },

  // Product
  { name: 'product.read', description: 'Ver productos', module: 'product', action: 'read' },
  { name: 'product.create', description: 'Crear productos', module: 'product', action: 'create' },
  { name: 'product.update', description: 'Modificar productos', module: 'product', action: 'update' },
  { name: 'product.delete', description: 'Eliminar/deshabilitar productos', module: 'product', action: 'delete' },

  // Reports
  { name: 'reports.read', description: 'Ver reportes', module: 'reports', action: 'read' },
  { name: 'reports.export', description: 'Exportar reportes', module: 'reports', action: 'export' },
  { name: 'reports.stock', description: 'Ver reporte de stock', module: 'reports', action: 'stock' },
  { name: 'reports.kardex', description: 'Ver reporte de kardex', module: 'reports', action: 'kardex' },
  { name: 'reports.balance', description: 'Ver reporte de balance de inventario', module: 'reports', action: 'balance' },

  // SIAT
  { name: 'siat.read',   description: 'Ver estado SIAT y catálogos', module: 'siat', action: 'read' },
  { name: 'siat.manage', description: 'Gestionar SIAT (sincronizaciones, cuis, cufd, certificados)', module: 'siat', action: 'manage' },

  // Significant Events
  { name: 'significant_event.read',   description: 'Ver eventos significativos', module: 'significant_event', action: 'read' },
  { name: 'significant_event.create', description: 'Crear eventos significativos', module: 'significant_event', action: 'create' },
  { name: 'significant_event.update', description: 'Actualizar eventos significativos', module: 'significant_event', action: 'update' },
  { name: 'significant_event.delete', description: 'Eliminar eventos significativos', module: 'significant_event', action: 'delete' },

  // Contingency
  { name: 'contingency.read',   description: 'Ver contingencias', module: 'contingency', action: 'read' },
  { name: 'contingency.create', description: 'Crear contingencias', module: 'contingency', action: 'create' },
  { name: 'contingency.update', description: 'Actualizar contingencias', module: 'contingency', action: 'update' },
  { name: 'contingency.delete', description: 'Eliminar contingencias', module: 'contingency', action: 'delete' },

  // System
  { name: 'system.full_access', description: 'Acceso total al sistema', module: 'system', action: 'full_access' },
];

const ROLES = [
  {
    name: 'SUPER_ADMIN',
    description: 'Administrador del sistema con acceso total',
    permissions: PERMISSIONS.map(p => p.name),
  },
  {
    name: 'ADMIN',
    description: 'Administrador con permisos de gestión',
    permissions: [
      'users.read', 'users.create', 'users.update',
      'roles.read', 'roles.create', 'roles.update',
      'permissions.read',
      'sales.read', 'sales.create', 'sales.update', 'sales.delete',
      'note_sales.read', 'note_sales.manage',
      'inventory.read', 'inventory.create', 'inventory.manage',
      'inventory_entries.read', 'inventory_entries.create', 'inventory_entries.update', 'inventory_entries.delete',
      'inventory_exits.read', 'inventory_exits.create', 'inventory_exits.update', 'inventory_exits.delete',
      'inventory_entry', 'inventory_exit',
      'warehouse.read', 'warehouse.create', 'warehouse.update', 'warehouse.delete',
      'product.read', 'product.create', 'product.update', 'product.delete',
      'siat.read', 'siat.manage',
      'significant_event.read', 'significant_event.create', 'significant_event.update', 'significant_event.delete',
      'contingency.read', 'contingency.create', 'contingency.update', 'contingency.delete',
      'reports.read', 'reports.export', 'reports.stock', 'reports.kardex', 'reports.balance',
    ],
  },
  {
    name: 'MANAGER',
    description: 'Gerente con permisos de ventas e inventario',
    permissions: [
      'users.read',
      'roles.read',
      'permissions.read',
      'sales.read', 'sales.create', 'sales.update',
      'note_sales.read', 'note_sales.manage',
      'inventory.read', 'inventory.create', 'inventory.manage',
      'inventory_entries.read', 'inventory_entries.create', 'inventory_entries.update', 'inventory_entries.delete',
      'inventory_exits.read', 'inventory_exits.create', 'inventory_exits.update', 'inventory_exits.delete',
      'inventory_entry', 'inventory_exit',
      'warehouse.read', 'warehouse.create', 'warehouse.update', 'warehouse.delete',
      'product.read', 'product.create', 'product.update', 'product.delete',
      'siat.read', 'siat.manage',
      'significant_event.read', 'significant_event.create', 'significant_event.update', 'significant_event.delete',
      'contingency.read', 'contingency.create', 'contingency.update', 'contingency.delete',
      'reports.read', 'reports.export', 'reports.stock', 'reports.kardex', 'reports.balance',
    ],
  },
  {
    name: 'USER',
    description: 'Usuario estándar con permisos básicos',
    permissions: [
      'sales.read', 'sales.create',
      'note_sales.read',
      'inventory.read',
      'inventory_entries.read',
      'inventory_exits.read',
      'warehouse.read',
      'product.read',
      'siat.read',
      'reports.read', 'reports.stock', 'reports.kardex', 'reports.balance',
    ],
  },
  {
    name: 'AUDITOR',
    description: 'Auditor con permisos de solo lectura',
    permissions: [
      'users.read',
      'roles.read',
      'permissions.read',
      'sales.read',
      'note_sales.read',
      'inventory.read',
      'inventory_entries.read',
      'inventory_exits.read',
      'warehouse.read',
      'product.read',
      'siat.read',
      'reports.read', 'reports.export', 'reports.stock', 'reports.kardex', 'reports.balance',
    ],
  },
];

const DEPRECATED_PERMISSIONS = ['inventory_product', 'inventory_kardex', 'inventory_balance', 'inventory_warehouse'];

async function removeDeprecatedPermissions() {
  console.log('Removing deprecated permissions...');
  for (const name of DEPRECATED_PERMISSIONS) {
    const perm = await prisma.permission.findUnique({ where: { name } });
    if (!perm) continue;
    await prisma.permission.delete({ where: { id: perm.id } });
    console.log('Deleted:', name);
  }
}

async function seedPermissions() {
  console.log('Seeding permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
}

async function seedRoles() {
  console.log('Seeding roles...');
  for (const roleData of ROLES) {
    const { permissions: permNames, ...role } = roleData;
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });

    await prisma.rolePermission.deleteMany({
      where: { roleId: createdRole.id },
    });

    const permissions = await prisma.permission.findMany({
      where: { name: { in: permNames } },
    });

    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: createdRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: createdRole.id, permissionId: perm.id },
      });
    }
  }
}

async function seedUsers() {
  console.log('Seeding users...');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@demo.bo',
      password: hashedPassword,
      isActive: true,
    },
  });

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: superAdminRole.id },
    });
  }

  const userUser = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      email: 'user@demo.bo',
      password: hashedPassword,
      isActive: true,
    },
  });

  const userRole = await prisma.role.findUnique({ where: { name: 'USER' } });
  if (userRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: userUser.id, roleId: userRole.id } },
      update: {},
      create: { userId: userUser.id, roleId: userRole.id },
    });
  }
}

async function main(): Promise<void> {
  console.log('Starting seed...');

  // Seed auth models first
  await removeDeprecatedPermissions();
  await seedPermissions();
  await seedRoles();
  await seedUsers();

  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });

  const companyNit = process.env.SIAT_NIT ?? '370395025';
  const companyName = process.env.SIAT_RAZON_SOCIAL ?? 'FACTURACION IC S.R.L.';
  const environmentCode = Number(process.env.SIAT_AMBIENTE ?? 2);
  const modalityCode = Number(process.env.SIAT_MODALIDAD ?? 2);
  const systemCode = process.env.SIAT_SISTEMA ?? '95FC61B3BA7';

  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: {
      nit: companyNit,
      name: companyName,
      nameCompany: companyName,
      environmentCode,
      modalityCode,
      systemCode,
      state: 1,
      typePrint: 1,
    },
    create: {
      id: 1,
      nit: companyNit,
      name: companyName,
      nameCompany: companyName,
      description: 'Empresa demo de facturación electrónica',
      environmentCode,
      modalityCode,
      systemCode,
      state: 1,
      typePrint: 1,
    },
  });

  const token = await prisma.token.upsert({
    where: { id: 1 },
    update: {
      value: process.env.SIAT_TOKEN ?? 'TokenApi DEMO',
      version: 2,
      state: 1,
    },
    create: {
      id: 1,
      value: process.env.SIAT_TOKEN ?? 'TokenApi DEMO',
      version: 2,
      state: 1,
      companyId: company.id,
    },
  });

  const branchOffice = await prisma.branchOffice.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nit: companyNit,
      name: 'CASA MATRIZ',
      tradename: 'CASA MATRIZ',
      code: 0,
      address: 'Av. Siempre Viva 742',
      city: 'La Paz',
      cityTaxes: 'La Paz',
      phone: '2222222',
      email: 'facturacion@demo.bo',
      web: 'www.demo.bo',
      state: 1,
      companyId: company.id,
    },
  });

  const pointSaleType = await prisma.pointSaleType.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, classifierCode: '1', description: 'Ventanilla', state: 1 },
  });

  const pointSale = await prisma.pointSale.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      pointSaleCode: 0,
      pointSaleName: 'PUNTO DE VENTA 0',
      pointSaleTypeName: 'Ventanilla',
      state: 1,
      pointSaleTypeId: pointSaleType.id,
      branchOfficeId: branchOffice.id,
    },
  });

  const city = await prisma.city.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'La Paz', state: 1 },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'ALMACÉN PRINCIPAL',
      code: 'ALM-001',
      address: 'Av. Siempre Viva 742',
      description: 'Almacén por defecto de la casa matriz',
      state: 1,
      branchOfficeId: branchOffice.id,
    },
  });

  // ---- Clientes ----
  const customers = [
    { id: 1, code: 1, nit: '1020304012', invoiceName: 'JUAN PEREZ', name: 'JUAN PEREZ', phone1: '70000000', email: 'juan@demo.bo', cityId: city.id, identityDocumentTypeId: 1 },
    { id: 2, code: 2, nit: '99001', invoiceName: 'VENTA AL EXTERIOR O SIN NIT', name: null, cityId: city.id, identityDocumentTypeId: 2 },
    { id: 3, code: 3, nit: '99002', invoiceName: 'CONTROL TRIBUTARIO', name: null, cityId: city.id, identityDocumentTypeId: 2 },
    { id: 4, code: 4, nit: '99003', invoiceName: 'VENTAS MENORES DEL DIA', name: null, cityId: city.id, identityDocumentTypeId: 2 },
  ];
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: { nit: c.nit },
      create: { ...c, synchronized: 0, state: 1 },
    });
  }

  // ---- Grupo, Modelo, Tipo de Producto ----
  const group = await prisma.group.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'GRUPO', description: 'GRUPO', state: 1 },
  });

  const productModel = await prisma.productModel.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, code: 'MOD01', name: 'MODELO', state: 1 },
  });

  const productType = await prisma.productType.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Tipo Producto', description: 'Tipo Producto', state: 1 },
  });

  console.log('Seed completado: usuarios, roles, permisos, empresa, punto de venta, almacén, clientes, grupo/modelo/tipo producto.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });