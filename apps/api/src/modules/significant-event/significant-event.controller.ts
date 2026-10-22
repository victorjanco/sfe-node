import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { SignificantEventService } from './significant-event.service';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@Controller('significant-event')
export class SignificantEventController {
  constructor(private readonly service: SignificantEventService) {}

  @CheckAbility({ action: Action.Read, subject: 'SignificantEvent' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @CheckAbility({ action: Action.Read, subject: 'SignificantEvent' })
  @Get('get_list_enabled')
  findEnabled() {
    return this.service.findEnabled();
  }

  @CheckAbility({ action: Action.Read, subject: 'SignificantEvent' })
  @Get('get_active_event')
  getActiveEvent(@Query('point_sale_id') pointSaleId?: string) {
    return this.service.getActiveEvent(pointSaleId ? Number(pointSaleId) : undefined);
  }

  @CheckAbility({ action: Action.Read, subject: 'SignificantEvent' })
  @Get('get_reason_events')
  getReasonEvents() {
    return this.service.getReasonEvents();
  }

  @CheckAbility({ action: Action.Read, subject: 'SignificantEvent' })
  @Get('get_contingencies')
  getContingencies() {
    return this.service.getContingencies();
  }

  @CheckAbility({ action: Action.Read, subject: 'SignificantEvent' })
  @Get('get_available_invoices')
  getAvailableInvoices() {
    return this.service.getAvailableInvoices();
  }

  @CheckAbility({ action: Action.Read, subject: 'SignificantEvent' })
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(Number(id));
  }

  @CheckAbility({ action: Action.Create, subject: 'SignificantEvent' })
  @Post('store')
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @CheckAbility({ action: Action.Create, subject: 'SignificantEvent' })
  @Post('send_invoice_significant_event')
  sendInvoiceSignificantEvent(@Body() body: any) {
    return this.service.sendInvoiceSignificantEvent(Number(body.id));
  }

  @CheckAbility({ action: Action.Create, subject: 'SignificantEvent' })
  @Post(':id/link-invoices')
  linkInvoices(@Param('id') id: string, @Body() body: { invoiceIds: number[] }) {
    return this.service.linkInvoices(Number(id), body.invoiceIds);
  }

  @CheckAbility({ action: Action.Delete, subject: 'SignificantEvent' })
  @Post(':id/unlink-invoices')
  unlinkInvoices(@Param('id') id: string, @Body() body: { invoiceIds: number[] }) {
    return this.service.unlinkInvoices(Number(id), body.invoiceIds);
  }

  @CheckAbility({ action: Action.Update, subject: 'SignificantEvent' })
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(Number(id), body);
  }

  @CheckAbility({ action: Action.Delete, subject: 'SignificantEvent' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
