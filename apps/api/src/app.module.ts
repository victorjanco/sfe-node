import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CatalogSiatModule } from './modules/catalog-siat/catalog-siat.module';
import { CompanyModule } from './modules/company/company.module';
import { CustomerModule } from './modules/customer/customer.module';
import { ProductModule } from './modules/product/product.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SiatModule } from './modules/siat/siat.module';
import { SaleModule } from './modules/sale/sale.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { FacturasModule } from './modules/facturas/facturas.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { CaslGuard } from './modules/authorization/casl.guard';

@Module({
  imports: [
    PrismaModule,
    CompanyModule,
    CustomerModule,
    ProductModule,
    InventoryModule,
    SiatModule,
    SaleModule,
    CatalogSiatModule,
    AuthModule,
    AuthorizationModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    FacturasModule,
    SystemConfigModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CaslGuard,
    },
  ],
})
export class AppModule {}