import { Global, Module } from '@nestjs/common';
import { SiatController } from './siat.controller';
import { SiatConfigService } from './siat-config.service';
import { SiatSoapClient } from './siat-soap.client';

@Global()
@Module({
  controllers: [SiatController],
  providers: [SiatConfigService, SiatSoapClient],
  exports: [SiatConfigService, SiatSoapClient],
})
export class SiatModule {}