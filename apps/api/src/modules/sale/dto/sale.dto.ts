import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';

export class SaleDetailDto {
  @IsOptional() @IsNumber() id?: number;
  @IsOptional() @IsNumber() product_id?: number;
  @IsOptional() @IsString() product_code?: string;
  @IsOptional() @IsString() product_name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() cost_price?: number | string;
  @IsOptional() selling_price?: number | string;
  @IsOptional() amount?: number | string;
  @IsOptional() subtotal?: number | string;
  @IsOptional() discount?: number | string;
  @IsOptional() total?: number | string;
  @IsOptional() @IsNumber() products_services_id?: number;
  @IsOptional() @IsNumber() unit_measure_id?: number;
  @IsOptional() @IsString() unit_measure?: string;
  @IsOptional() @IsString() serial_number?: string;
  @IsOptional() @IsString() imei_number?: string;
}

export class SaleStoreDto {
  @IsOptional() @IsNumber() id?: number;
  @IsOptional() @IsNumber() invoice_num?: number;
  @IsOptional() @IsString() sale_type?: string;
  @IsOptional() subtotal?: number | string;
  @IsOptional() discount?: number | string;
  @IsOptional() total?: number | string;
  @IsOptional() total_to_pay?: number | string;
  @IsOptional() tax_credit_base_amount?: number | string;
  @IsOptional() @IsNumber() customer_id?: number;
  @IsOptional() @IsString() nit_customer?: string;
  @IsOptional() @IsString() name_customer?: string;
  @IsOptional() @IsString() email_customer?: string;
  @IsOptional() @IsString() complement?: string;
  @IsOptional() @IsString() sale_date?: string;
  @IsOptional() change_type?: number | string;
  @IsOptional() @IsString() money?: string;
  @IsOptional() @IsString() card_number?: string;
  @IsOptional() gift_card_amount?: number | string;
  @IsOptional() @IsString() identity_document_type_code?: string;
  @IsOptional() @IsString() type_exception?: string;
  @IsOptional() @IsNumber() exception_code?: number;
  @IsOptional() @IsIn([0, 1]) inventory?: number;
  @IsOptional() check_efectivo?: boolean | number | string;
  @IsOptional() check_tarjeta?: boolean | number | string;
  @IsOptional() check_gift_card?: boolean | number | string;
  @IsOptional() check_otros?: boolean | number | string;
  @IsOptional() @IsNumber() company_id?: number;
  @IsOptional() @IsNumber() branch_office_id?: number;
  @IsOptional() @IsNumber() activity_id?: number;
  @IsOptional() @IsNumber() sector_document_id?: number;
  @IsOptional() @IsNumber() payment_method_type_id?: number;
  @IsOptional() @IsNumber() identity_document_type_id?: number;
  @IsOptional() @IsNumber() type_invoice_document_id?: number;
  @IsOptional() reason_event_id?: number;
  @IsOptional() @IsNumber() significant_event_id?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SaleDetailDto)
  array_detalle?: SaleDetailDto[];
}