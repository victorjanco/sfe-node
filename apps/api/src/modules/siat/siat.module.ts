import { Global, Module } from '@nestjs/common';
import { SiatController } from './siat.controller';
import { SiatConfigService } from './siat-config.service';
import { SiatSoapClient } from './siat-soap.client';
import { SiatEmisionClient } from './siat-emision.client';
import { SiatExpirationService } from './siat-expiration.service';
import { SiatService } from './siat.service';

@Global()
@Module({
  controllers: [SiatController],
  providers: [SiatConfigService, SiatSoapClient, SiatEmisionClient, SiatExpirationService, SiatService],
  exports: [SiatConfigService, SiatSoapClient, SiatEmisionClient, SiatExpirationService, SiatService],
})
export class SiatModule {}