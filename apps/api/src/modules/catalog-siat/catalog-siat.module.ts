import { Module } from '@nestjs/common';
import { CatalogSiatController } from './catalog-siat.controller';

@Module({
  controllers: [CatalogSiatController],
})
export class CatalogSiatModule {}