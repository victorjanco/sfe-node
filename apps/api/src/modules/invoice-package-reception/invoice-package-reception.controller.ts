import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { InvoicePackageReceptionService } from './invoice-package-reception.service';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@Controller('invoice-package-reception')
export class InvoicePackageReceptionController {
  constructor(private readonly service: InvoicePackageReceptionService) {}

  @CheckAbility({ action: Action.Read, subject: 'SignificantEvent' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @CheckAbility({ action: Action.Read, subject: 'SignificantEvent' })
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(Number(id));
  }

  @CheckAbility({ action: Action.Read, subject: 'SignificantEvent' })
  @Get('by-event/:eventId')
  findBySignificantEvent(@Param('eventId') eventId: string) {
    return this.service.findBySignificantEvent(Number(eventId));
  }

  @CheckAbility({ action: Action.Create, subject: 'SignificantEvent' })
  @Post('store')
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @CheckAbility({ action: Action.Create, subject: 'SignificantEvent' })
  @Post('validation')
  createValidation(@Body() body: any) {
    return this.service.createValidation(body);
  }

  @CheckAbility({ action: Action.Delete, subject: 'SignificantEvent' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
