import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlanService } from './plan.service';

@ApiTags('Plans')
@Controller('plans')
export class PlanPublicController {
  constructor(private readonly planService: PlanService) {}

  @Get('public')
  @ApiOperation({ summary: 'List all active plans with modules (public)' })
  async findAllPublic() {
    const plans = await this.planService.findAll();
    return plans.filter((p) => p.is_active);
  }
}
