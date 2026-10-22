import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { ContingencyService } from './contingency.service';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@Controller('contingency')
export class ContingencyController {
  constructor(private readonly service: ContingencyService) {}

  @CheckAbility({ action: Action.Read, subject: 'Contingency' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @CheckAbility({ action: Action.Read, subject: 'Contingency' })
  @Get('get_list_enabled')
  findEnabled() {
    return this.service.findEnabled();
  }

  @CheckAbility({ action: Action.Read, subject: 'Contingency' })
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(Number(id));
  }

  @CheckAbility({ action: Action.Create, subject: 'Contingency' })
  @Post('store')
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @CheckAbility({ action: Action.Update, subject: 'Contingency' })
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(Number(id), body);
  }

  @CheckAbility({ action: Action.Delete, subject: 'Contingency' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
