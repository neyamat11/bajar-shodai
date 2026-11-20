import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDeliveryOriginDto } from './dto/create-delivery-origin.dto';
import { UpdateDeliveryOriginDto } from './dto/update-delivery-origin.dto';
import { haversineKm } from '../../../common/delivery/fee';

@Injectable()
export class DeliveryOriginsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.deliveryOrigin.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const origin = await this.prisma.deliveryOrigin.findUnique({ where: { id } });
    if (!origin) throw new NotFoundException('Delivery origin not found');
    return origin;
  }

  async create(dto: CreateDeliveryOriginDto) {
    if (dto.isDefault) {
      await this.prisma.deliveryOrigin.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    } else {
      const count = await this.prisma.deliveryOrigin.count();
      if (count === 0) {
        dto.isDefault = true;
      }
    }
    return this.prisma.deliveryOrigin.create({ data: dto });
  }

  async update(id: string, dto: UpdateDeliveryOriginDto) {
    await this.findOne(id);
    if (dto.isDefault) {
      await this.prisma.deliveryOrigin.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.deliveryOrigin.update({
      where: { id },
      data: dto,
    });
  }

  async setDefault(id: string) {
    const origin = await this.findOne(id);
    if (!origin.isActive) {
      throw new BadRequestException('Cannot set an inactive origin as default');
    }
    await this.prisma.deliveryOrigin.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    return this.prisma.deliveryOrigin.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async remove(id: string) {
    const origin = await this.findOne(id);
    const activeCount = await this.prisma.deliveryOrigin.count({
      where: { isActive: true },
    });
    if (origin.isActive && activeCount <= 1) {
      throw new BadRequestException('Cannot delete the only active delivery origin point');
    }
    if (origin.isDefault) {
      throw new BadRequestException('Cannot delete the default origin point. Set another origin as default first.');
    }
    return this.prisma.deliveryOrigin.delete({ where: { id } });
  }

  /**
   * Finds the nearest active origin point to the given coordinates via Haversine straight-line distance.
   * If no active origins exist, falls back to default origin, or null.
   */
  async findNearest(lat: number, lng: number) {
    const origins = await this.prisma.deliveryOrigin.findMany({
      where: { isActive: true },
    });
    if (!origins.length) {
      return this.prisma.deliveryOrigin.findFirst({
        where: { isDefault: true },
      });
    }
    let nearest = origins[0];
    let minDist = haversineKm(
      { lat: origins[0].latitude, lng: origins[0].longitude },
      { lat, lng },
    );
    for (let i = 1; i < origins.length; i++) {
      const d = haversineKm(
        { lat: origins[i].latitude, lng: origins[i].longitude },
        { lat, lng },
      );
      if (d < minDist) {
        minDist = d;
        nearest = origins[i];
      }
    }
    return nearest;
  }
}
