import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryOriginDto } from './create-delivery-origin.dto';

export class UpdateDeliveryOriginDto extends PartialType(CreateDeliveryOriginDto) {}
