import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'nuevo_usuario' })
  @IsNotEmpty()
  @IsString()
  username: string = '';

  @ApiProperty({ example: 'usuario@demo.bo' })
  @IsEmail()
  email: string = '';

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string = '';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: [1, 2] })
  @IsOptional()
  roleIds?: number[];

  @ApiPropertyOptional({ example: [1, 2] })
  @IsOptional()
  permissionIds?: number[];
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'usuario@demo.bo' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'newpassword123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: [1, 2] })
  @IsOptional()
  roleIds?: number[];

  @ApiPropertyOptional({ example: [1, 2] })
  @IsOptional()
  permissionIds?: number[];
}

export class AssignRoleDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  roleId: number = 0;
}

export class AssignPermissionDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  permissionId: number = 0;
}