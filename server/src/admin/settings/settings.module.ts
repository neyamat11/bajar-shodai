import { Module } from '@nestjs/common';
import { AdminSettingsController } from './settings.controller';
import { DeliveryOriginsModule } from './delivery-origins/delivery-origins.module';

@Module({
  imports: [DeliveryOriginsModule],
  controllers: [AdminSettingsController],
  exports: [DeliveryOriginsModule],
})
export class AdminSettingsModule {}
