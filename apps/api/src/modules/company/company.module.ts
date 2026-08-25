import { Module } from '@nestjs/common';
import {
  BranchOfficeController,
  CompanyChildController,
  CompanyController,
  PointSaleController,
  TokenController,
} from './company.controller';

@Module({
  controllers: [
    CompanyController,
    BranchOfficeController,
    PointSaleController,
    TokenController,
    CompanyChildController,
  ],
})
export class CompanyModule {}