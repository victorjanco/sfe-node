import { Module } from '@nestjs/common';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { InventoryModule } from '../inventory/inventory.module';
import { SignificantEventModule } from '../significant-event/significant-event.module';

@Module({
  imports: [InventoryModule, SignificantEventModule],
  controllers: [SaleController],
  providers: [SaleService],
})
export class SaleModule {}