import { Module } from '@nestjs/common';

import { CampaignCategoryController } from './campaign-category.controller';
import { CampaignCategoryService } from './campaign-category.service';

@Module({
  controllers: [
    CampaignCategoryController,
  ],
  providers: [
    CampaignCategoryService,
  ],
  exports: [
    CampaignCategoryService,
  ],
})
export class CampaignCategoryModule {}
