import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class UpdateHomeSectionDto {
  @ApiPropertyOptional({ description: 'English title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Bangla title' })
  @IsOptional()
  @IsString()
  titleBn?: string;

  @ApiPropertyOptional({ description: 'English subtitle' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ description: 'Bangla subtitle' })
  @IsOptional()
  @IsString()
  subtitleBn?: string;

  @ApiPropertyOptional({ description: 'Category slug for View All link' })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ description: 'Maximum products allowed in this section' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  maxProducts?: number;

  @ApiPropertyOptional({ description: 'Display order on homepage' })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Whether section is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateHomeSectionProductsDto {
  @ApiProperty({
    description: 'Ordered list of product UUIDs for this section',
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(24, { message: 'Cannot feature more than 24 products in a section' })
  @IsUUID('4', { each: true, message: 'Each product ID must be a valid UUID' })
  productIds: string[];
}
