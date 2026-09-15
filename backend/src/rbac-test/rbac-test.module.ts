import { Module } from '@nestjs/common';
import { RbacTestController } from './rbac-test.controller';

@Module({
  controllers: [
    RbacTestController,
  ],
})
export class RbacTestModule {}
