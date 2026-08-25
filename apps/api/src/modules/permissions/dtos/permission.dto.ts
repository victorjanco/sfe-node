import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ example: 'users.read' })
  @IsNotEmpty()
  @IsString()
  name: string = '';

  @ApiPropertyOptional({ example: 'Ver usuarios' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'users' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ example: 'read' })
  @IsOptional()
  @IsString()
  action?: string;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional({ example: 'Ver usuarios' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'users' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ example: 'read' })
  @IsOptional()
  @IsString()
  action?: string;
}