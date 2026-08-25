import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class SaleQueryDto {
  @IsOptional() @IsString() date_from?: string;
  @IsOptional() @IsString() date_to?: string;
  @IsOptional() @IsNumberString() branch_office_id?: string;
  @IsOptional() @IsNumberString() point_sale_id?: string;
  @IsOptional() @IsString() sale_type?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsNumberString() take?: string;
  @IsOptional() @IsNumberString() skip?: string;
}
