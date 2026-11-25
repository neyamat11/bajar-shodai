import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class ReorderProductsDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Category UUID – products in this category will be reordered',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    type: [String],
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    description: 'Ordered array of product UUIDs from position 1 onwards',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids: string[];
}
