import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HomeSectionsService } from './home-sections.service';
import {
  UpdateHomeSectionDto,
  UpdateHomeSectionProductsDto,
} from './dto/home-sections.dto';

@ApiTags('Admin - Home Sections')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/home-sections')
export class HomeSectionsController {
  constructor(private readonly service: HomeSectionsService) {}

  @Get()
  @RequirePermissions('products.view')
  @ApiOperation({ summary: 'Get all homepage curated sections with their items' })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions('products.view')
  @ApiOperation({ summary: 'Get a single homepage section' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Update homepage section settings' })
  async updateSection(
    @Param('id') id: string,
    @Body() dto: UpdateHomeSectionDto,
    @CurrentUser() adminUser: User,
  ) {
    return this.service.updateSection(id, dto, adminUser);
  }

  @Put(':id/products')
  @RequirePermissions('products.manage')
  @ApiOperation({ summary: 'Update ordered list of products for a section' })
  async updateSectionProducts(
    @Param('id') id: string,
    @Body() dto: UpdateHomeSectionProductsDto,
    @CurrentUser() adminUser: User,
  ) {
    return this.service.updateSectionProducts(id, dto, adminUser);
  }
}
