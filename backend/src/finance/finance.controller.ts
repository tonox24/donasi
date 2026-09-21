import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { FinanceService } from './finance.service';
import { FinanceQueryDto } from './dto/finance-query.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

import { Permissions } from '../rbac/permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';

@Controller('finance')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
  ) {}

  // =========================================================
  // GET LEDGER
  // =========================================================

  @Get('ledger')
  @Permissions('finance.view')
  findAll(
    @Query() query: FinanceQueryDto,
  ) {
    return this.financeService.findAll(
      query,
    );
  }

  // =========================================================
  // GET LEDGER DETAIL
  // =========================================================

  @Get('ledger/:id')
  @Permissions('finance.view')
  findOne(
    @Param(
      'id',
      new ParseUUIDPipe(),
    )
    id: string,
  ) {
    return this.financeService.findOne(
      id,
    );
  }

  // =========================================================
  // FINANCE SUMMARY
  // =========================================================

  @Get('summary')
  @Permissions('finance.view')
  getSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.financeService.getSummary({
      dateFrom,
      dateTo,
      campaignId,
    });
  }

  // =========================================================
  // VOID LEDGER
  // =========================================================

  @Patch('ledger/:id/void')
  @Permissions('finance.manage')
  voidLedger(
    @Param(
      'id',
      new ParseUUIDPipe(),
    )
    id: string,

    @CurrentUser()
    user: { id: string },
  ) {
    return this.financeService.voidLedger(
      id,
      user.id,
    );
  }
}
