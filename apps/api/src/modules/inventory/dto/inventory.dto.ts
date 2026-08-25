import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class WarehouseDto {
  @IsString() name!: string;
  @IsString() code!: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() branchOfficeId!: number;
}

export class InventoryEntryDetailDto {
  @IsInt() productId!: number;
  @IsNumber() @Min(0.0001) quantity!: number;
  @IsNumber() @Min(0) costPrice!: number;
  @IsOptional() @IsInt() unitMeasureId?: number;
}

export class InventoryExitDetailDto {
  @IsInt() productId!: number;
  @IsNumber() @Min(0.0001) quantity!: number;
  @IsOptional() @IsInt() unitMeasureId?: number;
}

export const ENTRY_TYPES = ['INITIAL', 'PURCHASE', 'ADJUSTMENT', 'RETURN'] as const;
export const EXIT_TYPES = ['ADJUSTMENT', 'DAMAGE'] as const;

export class InventoryEntryDto {
  @IsIn(ENTRY_TYPES) entryType!: string;
  @IsOptional() @IsString() reference?: string;
  @IsInt() warehouseId!: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => InventoryEntryDetailDto)
  details!: InventoryEntryDetailDto[];
}

export class InventoryExitDto {
  @IsIn(EXIT_TYPES) exitType!: string;
  @IsOptional() @IsString() reference?: string;
  @IsInt() warehouseId!: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => InventoryExitDetailDto)
  details!: InventoryExitDetailDto[];
}

export class WithdrawForSaleDto {
  @IsInt() warehouseId!: number;
  @IsOptional() @IsInt() saleId?: number;
  @IsOptional() @IsString() reference?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => InventoryExitDetailDto)
  details!: InventoryExitDetailDto[];
}