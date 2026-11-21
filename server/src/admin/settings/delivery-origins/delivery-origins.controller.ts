import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from '../../../common/guards';
import { RequirePermissions } from '../../../common/decorators';
import { DeliveryOriginsService } from './delivery-origins.service';
import { CreateDeliveryOriginDto } from './dto/create-delivery-origin.dto';
import { UpdateDeliveryOriginDto } from './dto/update-delivery-origin.dto';

@ApiTags('Admin - Delivery Origins')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/settings/delivery-origins')
export class DeliveryOriginsController {
  constructor(private readonly service: DeliveryOriginsService) {}

  @Get()
  @RequirePermissions('staff')
  @ApiOperation({ summary: 'List all delivery origin points' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @RequirePermissions('staff', 'settings.manage')
  @ApiOperation({ summary: 'Create a new delivery origin point' })
  create(@Body() dto: CreateDeliveryOriginDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('staff', 'settings.manage')
  @ApiOperation({ summary: 'Update a delivery origin point' })
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryOriginDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/set-default')
  @RequirePermissions('staff', 'settings.manage')
  @ApiOperation({ summary: 'Set a delivery origin point as default' })
  setDefault(@Param('id') id: string) {
    return this.service.setDefault(id);
  }

  @Delete(':id')
  @RequirePermissions('staff', 'settings.manage')
  @ApiOperation({ summary: 'Delete a delivery origin point' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
