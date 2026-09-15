import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma.module';
import { RbacModule } from './rbac/rbac.module';
import { RbacTestModule } from './rbac-test/rbac-test.module';
import { ProgramModule } from './program/program.module';

@Module({
  imports: [
  ConfigModule.forRoot({
    isGlobal: true,
  }),
  PrismaModule,
  RbacModule,
  AuthModule,
  RbacTestModule,
  ProgramModule,
],
  controllers: [HealthController],
})
export class AppModule {}
