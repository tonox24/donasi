import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: any) {
    return {
      message: 'Registration endpoint ready',
      email: body.email,
    };
  }

  @Post('login')
  login(@Body() body: any) {
    return {
      message: 'Login endpoint ready',
      email: body.email,
    };
  }

  @Post('refresh')
  refresh() {
    return {
      message: 'Refresh token endpoint ready',
    };
  }

  @Get('me')
  me() {
    return {
      message: 'Authenticated user endpoint ready',
    };
  }

  @Post('logout')
  logout() {
    return {
      message: 'Logout endpoint ready',
    };
  }
}
