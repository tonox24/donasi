import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma.module';
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RbacModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
