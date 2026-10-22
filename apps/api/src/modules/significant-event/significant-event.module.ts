import { Module } from '@nestjs/common';
import { SignificantEventController } from './significant-event.controller';
import { SignificantEventService } from './significant-event.service';

@Module({
  controllers: [SignificantEventController],
  providers: [SignificantEventService],
  exports: [SignificantEventService],
})
export class SignificantEventModule {}