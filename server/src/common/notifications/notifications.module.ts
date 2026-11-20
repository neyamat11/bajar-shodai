import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { NotificationsService } from './notifications.service';
import { OrderNotifierService } from './order-notifier.service';
import { TicketNotifierService } from './ticket-notifier.service';

@Global()
@Module({
  imports: [PrismaModule, PushModule],
  providers: [
    NotificationsService,
    OrderNotifierService,
    TicketNotifierService,
  ],
  exports: [NotificationsService, OrderNotifierService, TicketNotifierService],
})
export class NotificationsModule {}
