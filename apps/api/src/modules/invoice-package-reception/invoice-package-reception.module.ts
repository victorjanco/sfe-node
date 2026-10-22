import { Module } from '@nestjs/common';
import { InvoicePackageReceptionService } from './invoice-package-reception.service';
import { InvoicePackageReceptionController } from './invoice-package-reception.controller';

@Module({
  controllers: [InvoicePackageReceptionController],
  providers: [InvoicePackageReceptionService],
  exports: [InvoicePackageReceptionService],
})
export class InvoicePackageReceptionModule {}
