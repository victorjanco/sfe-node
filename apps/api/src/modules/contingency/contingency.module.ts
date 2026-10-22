import { Module } from '@nestjs/common';
import { ContingencyController } from './contingency.controller';
import { ContingencyService } from './contingency.service';

@Module({
  controllers: [ContingencyController],
  providers: [ContingencyService],
})
export class ContingencyModule {}
