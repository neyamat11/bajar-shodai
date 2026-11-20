import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PushNotificationMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  constructor(private prisma: PrismaService) {}

  async registerToken(userId: string, pushToken: string, platform?: string) {
    if (!pushToken || typeof pushToken !== 'string') return;
    try {
      await this.prisma.staffDevice.upsert({
        where: { pushToken },
        create: {
          userId,
          pushToken,
          platform: platform ?? null,
        },
        update: {
          userId,
          platform: platform ?? null,
        },
      });
      this.logger.log(`Registered push token for user ${userId}`);
    } catch (err) {
      this.logger.error(`Failed to register push token: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async unregisterToken(pushToken: string) {
    if (!pushToken) return;
    try {
      await this.prisma.staffDevice.deleteMany({
        where: { pushToken },
      });
    } catch (err) {
      this.logger.error(`Failed to unregister push token: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async notifyAllStaff(msg: PushNotificationMessage) {
    try {
      // Find all staff, admin, and superadmin users with registered devices
      const devices = await this.prisma.staffDevice.findMany({
        where: {
          user: {
            role: {
              in: ['STAFF', 'ADMIN', 'SUPER_ADMIN'],
            },
          },
        },
        select: {
          id: true,
          pushToken: true,
        },
      });

      if (!devices.length) {
        return;
      }

      // Deduplicate push tokens
      const uniqueTokens = Array.from(new Set(devices.map((d) => d.pushToken).filter(Boolean)));
      if (!uniqueTokens.length) return;

      // Chunk tokens into batches of 100 (Expo limit)
      for (let i = 0; i < uniqueTokens.length; i += 100) {
        const chunk = uniqueTokens.slice(i, i + 100);
        const messages = chunk.map((to) => ({
          to,
          sound: 'default',
          title: msg.title,
          body: msg.body,
          data: msg.data ?? {},
          priority: 'high',
          channelId: 'rider',
        }));

        const response = await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(messages),
        });

        if (!response.ok) {
          this.logger.warn(`Expo push returned status ${response.status}`);
          continue;
        }

        const resData = (await response.json()) as any;
        if (Array.isArray(resData?.data)) {
          const invalidTokens: string[] = [];
          resData.data.forEach((ticket: any, idx: number) => {
            if (
              ticket?.status === 'error' &&
              ticket?.details?.error === 'DeviceNotRegistered'
            ) {
              invalidTokens.push(chunk[idx]);
            }
          });
          if (invalidTokens.length > 0) {
            await this.prisma.staffDevice.deleteMany({
              where: { pushToken: { in: invalidTokens } },
            });
            this.logger.log(`Cleaned up ${invalidTokens.length} unregistered push token(s)`);
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error sending push notification: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
