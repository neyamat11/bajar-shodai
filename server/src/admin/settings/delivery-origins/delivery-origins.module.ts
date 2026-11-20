import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { DeliveryOriginsController } from './delivery-origins.controller';
import { DeliveryOriginsService } from './delivery-origins.service';

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryOriginsController],
  providers: [DeliveryOriginsService],
  exports: [DeliveryOriginsService],
})
export class DeliveryOriginsModule {}
