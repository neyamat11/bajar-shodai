import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, MaxLength } from 'class-validator';

export class CreateDeliveryOriginDto {
  @ApiProperty({ example: 'Kalibari, Shahrasti' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'কালীবাড়ি, শাহরাস্তি' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameBn?: string;

  @ApiProperty({ example: 23.1017 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 91.0918 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  id?: string;

  @IsOptional()
  createdAt?: string;

  @IsOptional()
  updatedAt?: string;
}
