import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Req() request: any,
  ) {
    return this.authService.register(
      dto,
      this.getRequestContext(request),
    );
  }

  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Req() request: any,
  ) {
    return this.authService.login(
      dto,
      this.getRequestContext(request),
    );
  }

  @Post('refresh')
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: any,
  ) {
    return this.authService.refresh(
      dto.refreshToken,
      this.getRequestContext(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(
    @CurrentUser() user: { id: string },
  ) {
    return this.authService.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @CurrentUser() user: { id: string },
    @Body() dto: RefreshTokenDto,
    @Req() request: any,
  ) {
    return this.authService.logout(
      user.id,
      dto.refreshToken,
      this.getRequestContext(request),
    );
  }

  private getRequestContext(request: any) {
    return {
      ipAddress: request.ip,
      userAgent:
        request.headers?.['user-agent'],
    };
  }
}
