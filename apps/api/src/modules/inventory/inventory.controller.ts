import { Body, Controller, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  InventoryEntryDto,
  InventoryExitDto,
  WarehouseDto,
} from './dto/inventory.dto';
import { CheckAbility } from '../authorization/decorators/check-ability.decorator';
import { Action } from '../authorization/enums/action.enum';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @CheckAbility({ action: Action.Read, subject: 'InventoryStock' })
  @Get()
  async stock(@Query('warehouse_id') warehouseId?: string, @Query('search') search?: string) {
    return this.inventoryService.stock(
      warehouseId ? Number(warehouseId) : undefined,
      search,
    );
  }

  @CheckAbility({ action: Action.Read, subject: 'InventoryKardex' })
  @Get('kardex')
  async kardex(@Query('product_id') productId?: string, @Query('warehouse_id') warehouseId?: string) {
    return this.inventoryService.kardex(
      productId ? Number(productId) : undefined,
      warehouseId ? Number(warehouseId) : undefined,
    );
  }

  @CheckAbility({ action: Action.Read, subject: 'InventoryStock' })
  @Get('stock-minimo')
  async stockMinimo() {
    return this.inventoryService.stockMinimo();
  }

  @CheckAbility({ action: Action.Read, subject: 'InventoryBalance' })
  @Get('balance')
  async balance(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('product_id') productId?: string,
  ) {
    return this.inventoryService.balance({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000) : undefined,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      productId: productId ? Number(productId) : undefined,
    });
  }

  @CheckAbility({ action: Action.Read, subject: 'Warehouse' })
  @Get('warehouses')
  async warehouses() {
    return this.inventoryService.listWarehouses();
  }

  @CheckAbility({ action: Action.Create, subject: 'Warehouse' })
  @Post('warehouses')
  async createWarehouse(@Body() body: WarehouseDto) {
    return this.inventoryService.createWarehouse(body);
  }

  @CheckAbility({ action: Action.Update, subject: 'Warehouse' })
  @Put('warehouses/update')
  async updateWarehouse(@Body() body: Partial<WarehouseDto> & { id: number }) {
    const { id, ...data } = body;
    return this.inventoryService.updateWarehouse(id, data);
  }

  @CheckAbility({ action: Action.Delete, subject: 'Warehouse' })
  @Put('warehouses/disable')
  async disableWarehouse(@Body() body: { id: number }) {
    return this.inventoryService.disableWarehouse(body.id);
  }

  @CheckAbility({ action: Action.Read, subject: 'InventoryEntry' })
  @Get('entries')
  async listEntries(
    @Query('warehouse_id') warehouseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.inventoryService.listEntries({
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000) : undefined,
    });
  }

  @CheckAbility({ action: Action.Read, subject: 'InventoryEntry' })
  @Get('entries/:id')
  async getEntry(@Param('id') id: string) {
    const entryId = Number(id);
    if (!Number.isInteger(entryId) || entryId <= 0) {
      throw new NotFoundException(`Ingreso ${id} no encontrado`);
    }
    return this.inventoryService.getEntry(entryId);
  }

  @CheckAbility({ action: Action.Delete, subject: 'InventoryEntry' })
  @Put('entries/:id/anular')
  async annulEntry(@Param('id') id: string) {
    const entryId = Number(id);
    if (!Number.isInteger(entryId) || entryId <= 0) {
      throw new NotFoundException(`Ingreso ${id} no encontrado`);
    }
    return this.inventoryService.annulEntry(entryId);
  }

  @CheckAbility({ action: Action.Create, subject: 'InventoryEntry' })
  @Post('entries')
  async registerEntry(@Body() body: InventoryEntryDto) {
    return this.inventoryService.registerEntry(body, 1);
  }

  @CheckAbility({ action: Action.Read, subject: 'InventoryExit' })
  @Get('exits')
  async listExits(
    @Query('warehouse_id') warehouseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.inventoryService.listExits({
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000) : undefined,
    });
  }

  @CheckAbility({ action: Action.Read, subject: 'InventoryExit' })
  @Get('exits/:id')
  async getExit(@Param('id') id: string) {
    const exitId = Number(id);
    if (!Number.isInteger(exitId) || exitId <= 0) {
      throw new NotFoundException(`Salida ${id} no encontrada`);
    }
    return this.inventoryService.getExit(exitId);
  }

  @CheckAbility({ action: Action.Delete, subject: 'InventoryExit' })
  @Put('exits/:id/anular')
  async annulExit(@Param('id') id: string) {
    const exitId = Number(id);
    if (!Number.isInteger(exitId) || exitId <= 0) {
      throw new NotFoundException(`Salida ${id} no encontrada`);
    }
    return this.inventoryService.annulExit(exitId);
  }

  @CheckAbility({ action: Action.Create, subject: 'InventoryExit' })
  @Post('exits')
  async registerExit(@Body() body: InventoryExitDto) {
    return this.inventoryService.registerExit(body, 1);
  }
}