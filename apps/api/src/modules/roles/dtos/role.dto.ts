import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'NUEVO_ROL' })
  @IsNotEmpty()
  @IsString()
  name: string = '';

  @ApiPropertyOptional({ example: 'Descripción del rol' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: [1, 2, 3] })
  @IsOptional()
  permissionIds?: number[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Nueva descripción' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: [1, 2, 3] })
  @IsOptional()
  permissionIds?: number[];
}

export class AssignPermissionDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  permissionId: number = 0;
}