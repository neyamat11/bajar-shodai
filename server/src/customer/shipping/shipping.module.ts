import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { DeliveryOriginsModule } from '../../admin/settings/delivery-origins/delivery-origins.module';

@Module({
  imports: [DeliveryOriginsModule],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
