import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { TableSessionService } from './table-session.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { TransferSessionDto } from './dto/transfer-session.dto';
import { MergeSessionDto } from './dto/merge-session.dto';
import { SplitBillEqualDto } from './dto/split-bill.dto';
import { CurrentTenant, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Table Sessions')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@Controller('table-sessions')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class TableSessionController {
  constructor(private readonly service: TableSessionService) {}

  @Post('open')
  @RequirePermissions('table:update')
  @ApiOperation({ summary: 'Open a new session for a table' })
  open(@Body() dto: OpenSessionDto, @CurrentTenant('id') tenantId: string) {
    return this.service.openSession(dto, tenantId);
  }

  @Post(':id/close')
  @RequirePermissions('table:update')
  @ApiOperation({ summary: 'Close a table session' })
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.closeSession(id, tenantId);
  }

  @Get(':id')
  @RequirePermissions('table:read')
  @ApiOperation({ summary: 'Get session details with orders' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.getSessionWithOrders(id, tenantId);
  }

  @Get('active/:tableId')
  @RequirePermissions('table:read')
  @ApiOperation({ summary: 'Get active session for a table' })
  getActive(
    @Param('tableId', ParseUUIDPipe) tableId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.getActiveSession(tableId, tenantId);
  }

  @Post(':id/transfer')
  @RequirePermissions('table:update')
  @ApiOperation({ summary: 'Transfer session to another table' })
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferSessionDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.transferTable(id, dto.table_id, tenantId);
  }

  @Post(':id/merge')
  @RequirePermissions('table:update')
  @ApiOperation({ summary: 'Merge session into another session' })
  merge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MergeSessionDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.mergeSessions(id, dto.target_session_id, tenantId);
  }

  @Get(':id/bill')
  @RequirePermissions('table:read')
  @ApiOperation({ summary: 'Get bill summary for a session' })
  getBill(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.getBillSummary(id, tenantId);
  }

  @Post(':id/split-equal')
  @RequirePermissions('table:read')
  @ApiOperation({ summary: 'Split bill equally among people' })
  splitEqual(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SplitBillEqualDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.splitBillEqual(id, dto.number_of_people, tenantId);
  }

  @Get(':id/split-consumption')
  @RequirePermissions('table:read')
  @ApiOperation({ summary: 'Split bill by customer consumption' })
  splitByConsumption(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.splitBillByConsumption(id, tenantId);
  }
}
