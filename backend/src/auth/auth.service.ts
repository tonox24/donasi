import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validatePassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async generateToken(user: {
    id: string;
    email: string;
    roles?: string[];
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles ?? [],
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }

  async validateUser(email: string, password: string) {
    // Database authentication will be connected after Prisma service
    // is implemented.
    throw new UnauthorizedException(
      `Authentication for ${email} is not connected to database yet.`,
    );
  }
}
