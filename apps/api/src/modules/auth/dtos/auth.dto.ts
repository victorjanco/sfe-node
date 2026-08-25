import { IsEmail, IsNotEmpty, IsOptional, IsNumber, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsNotEmpty()
  @IsString()
  username: string = '';

  @ApiProperty({ example: 'admin123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string = '';

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  branchOfficeId?: number;
}

export class RegisterDto {
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
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string = '';

  @ApiProperty()
  user: {
    id: number;
    username: string;
    email: string;
    roles: string[];
    permissions: string[];
    branchOfficeId?: number;
  } = { id: 0, username: '', email: '', roles: [], permissions: [], branchOfficeId: undefined };
}