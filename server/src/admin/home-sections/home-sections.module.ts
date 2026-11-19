import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheModule } from '../../common/cache';
import { StorefrontModule } from '../../common/storefront/storefront.module';
import { HomeSectionsController } from './home-sections.controller';
import { HomeSectionsService } from './home-sections.service';

@Module({
  imports: [PrismaModule, CacheModule, StorefrontModule],
  controllers: [HomeSectionsController],
  providers: [HomeSectionsService],
  exports: [HomeSectionsService],
})
export class HomeSectionsModule {}
