import { Module } from '@nestjs/common';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { SiatEmisionClient } from './siat-emision.client';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [SaleController],
  providers: [SaleService, SiatEmisionClient],
})
export class SaleModule {}