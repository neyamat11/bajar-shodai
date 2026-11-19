import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';
import { StorefrontSyncService } from '../../common/storefront/storefront-sync.service';
import { writeAudit } from '../../common/audit/audit.service';
import {
  UpdateHomeSectionDto,
  UpdateHomeSectionProductsDto,
} from './dto/home-sections.dto';

const sectionProductSelect = {
  id: true,
  name: true,
  nameBn: true,
  slug: true,
  productCode: true,
  regularPrice: true,
  sellingPrice: true,
  stock: true,
  trackStock: true,
  status: true,
  brandName: true,
  categoryName: true,
  images: {
    orderBy: [{ isMain: 'desc' as const }, { order: 'asc' as const }],
    take: 1,
    select: { url: true, alt: true },
  },
  unit: {
    select: {
      shortLabel: true,
      shortLabelBn: true,
    },
  },
} satisfies Prisma.ProductSelect;

function mapProduct(p: any) {
  return {
    id: p.id,
    name: p.name,
    nameBn: p.nameBn,
    slug: p.slug,
    productCode: p.productCode,
    regularPrice: Number(p.regularPrice),
    sellingPrice: Number(p.sellingPrice),
    stock: p.trackStock ? Number(p.stock) : 0,
    trackStock: p.trackStock,
    status: p.status,
    brandName: p.brandName,
    categoryName: p.categoryName,
    mainImage: p.images?.[0]?.url || null,
    unit: p.unit,
  };
}

@Injectable()
export class HomeSectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly storefrontSync: StorefrontSyncService,
  ) {}

  /**
   * Returns all homepage sections ordered by displayOrder, with their curated products.
   */
  async findAll() {
    const sections = await this.prisma.homeSection.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          include: {
            product: {
              select: sectionProductSelect,
            },
          },
        },
      },
    });

    return sections.map((sec) => ({
      id: sec.id,
      slug: sec.slug,
      title: sec.title,
      titleBn: sec.titleBn,
      subtitle: sec.subtitle,
      subtitleBn: sec.subtitleBn,
      categorySlug: sec.categorySlug,
      displayOrder: sec.displayOrder,
      maxProducts: sec.maxProducts,
      isActive: sec.isActive,
      createdAt: sec.createdAt,
      updatedAt: sec.updatedAt,
      products: sec.items
        .filter((item) => item.product)
        .map((item) => mapProduct(item.product)),
    }));
  }

  /**
   * Returns a single homepage section by id or slug.
   */
  async findOne(idOrSlug: string) {
    const sec = await this.prisma.homeSection.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          include: {
            product: {
              select: sectionProductSelect,
            },
          },
        },
      },
    });

    if (!sec) {
      throw new NotFoundException(`Home section ${idOrSlug} not found.`);
    }

    return {
      id: sec.id,
      slug: sec.slug,
      title: sec.title,
      titleBn: sec.titleBn,
      subtitle: sec.subtitle,
      subtitleBn: sec.subtitleBn,
      categorySlug: sec.categorySlug,
      displayOrder: sec.displayOrder,
      maxProducts: sec.maxProducts,
      isActive: sec.isActive,
      createdAt: sec.createdAt,
      updatedAt: sec.updatedAt,
      products: sec.items
        .filter((item) => item.product)
        .map((item) => mapProduct(item.product)),
    };
  }

  /**
   * Updates metadata of a homepage section.
   */
  async updateSection(id: string, dto: UpdateHomeSectionDto, adminUser: User) {
    const existing = await this.prisma.homeSection.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Home section ${id} not found.`);
    }

    const updated = await this.prisma.homeSection.update({
      where: { id },
      data: {
        ...dto,
      },
    });

    await writeAudit(this.prisma, {
      adminId: adminUser.id,
      action: 'SETTINGS_UPDATED',
      entity: 'home_section',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });

    await this.cache.delByPrefix('products:home');
    this.storefrontSync.notify(['home', 'products']);

    return this.findOne(id);
  }

  /**
   * Atomically updates products in a section and their display order.
   */
  async updateSectionProducts(
    id: string,
    dto: UpdateHomeSectionProductsDto,
    adminUser: User,
  ) {
    const { productIds } = dto;

    const section = await this.prisma.homeSection.findUnique({ where: { id } });
    if (!section) {
      throw new NotFoundException(`Home section ${id} not found.`);
    }

    // Check duplicates
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Each product may only appear once in the section.');
    }

    if (productIds.length > section.maxProducts) {
      throw new BadRequestException(
        `Cannot add more than ${section.maxProducts} products to section "${section.title}".`,
      );
    }

    // Verify products exist
    if (productIds.length > 0) {
      const existing = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });
      if (existing.length !== productIds.length) {
        const found = new Set(existing.map((e) => e.id));
        const missing = productIds.filter((pId) => !found.has(pId));
        throw new BadRequestException(`Products not found: ${missing.join(', ')}`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Delete current items
      await tx.homeSectionItem.deleteMany({
        where: { sectionId: id },
      });

      // 2. Insert new items with displayOrder
      for (let i = 0; i < productIds.length; i++) {
        await tx.homeSectionItem.create({
          data: {
            sectionId: id,
            productId: productIds[i],
            displayOrder: i + 1,
          },
        });
      }

      await writeAudit(tx, {
        adminId: adminUser.id,
        action: 'PRODUCT_UPDATED',
        entity: 'home_section_items',
        entityId: id,
        newValue: { count: productIds.length, productIds },
      });
    });

    await this.cache.delByPrefix('products:home');
    this.storefrontSync.notify(['home', 'products']);

    return this.findOne(id);
  }
}
