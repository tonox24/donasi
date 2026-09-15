import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async validatePassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async writeAuditLog(
    action: string,
    entity: string,
    entityId?: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId ?? null,
        userId: userId ?? null,
        metadata: metadata ?? undefined,
      },
    });
  }

  private async getUserForAuth(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private buildAuthUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      roles: user.roles.map((item: any) => item.role.name),
      permissions: [
        ...new Set(
          user.roles.flatMap((item: any) =>
            item.role.permissions.map(
              (rolePermission: any) =>
                rolePermission.permission.code,
            ),
          ),
        ),
      ],
    };
  }

  private async issueTokens(user: any) {
    const authUser = this.buildAuthUser(user);

    const accessToken = await this.jwtService.signAsync({
      sub: authUser.id,
      email: authUser.email,
      roles: authUser.roles,
      tokenType: 'access',
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: authUser.id,
        tokenType: 'refresh',
      },
      {
        expiresIn: 2592000,
      },
    );

    const refreshPayload = this.jwtService.decode(refreshToken) as {
      exp: number;
    };

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashRefreshToken(refreshToken),
        userId: authUser.id,
        expiresAt: new Date(refreshPayload.exp * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: authUser,
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      await this.writeAuditLog(
        'AUTH_REGISTER_FAILED',
        'User',
        existingUser.id,
        existingUser.id,
        {
          reason: 'EMAIL_ALREADY_EXISTS',
        },
      );

      throw new ConflictException(
        'An account with this email already exists',
      );
    }

    const passwordHash = await this.hashPassword(dto.password);

    const donorRole = await this.prisma.role.findUnique({
      where: {
        name: 'DONOR',
      },
    });

    if (!donorRole) {
      throw new ConflictException(
        'DONOR role is not configured',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone?.trim() || null,
        fullName: dto.fullName.trim(),
        passwordHash,
        roles: {
          create: {
            roleId: donorRole.id,
          },
        },
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    await this.writeAuditLog(
      'AUTH_REGISTER',
      'User',
      user.id,
      user.id,
      {
        role: 'DONOR',
      },
    );

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      await this.writeAuditLog(
        'AUTH_LOGIN_FAILED',
        'User',
        undefined,
        undefined,
        {
          reason: 'USER_NOT_FOUND',
        },
      );

      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    if (user.status !== 'ACTIVE') {
      await this.writeAuditLog(
        'AUTH_LOGIN_FAILED',
        'User',
        user.id,
        user.id,
        {
          reason: 'USER_NOT_ACTIVE',
        },
      );

      throw new UnauthorizedException(
        'User account is not active',
      );
    }

    const validPassword = await this.validatePassword(
      dto.password,
      user.passwordHash,
    );

    if (!validPassword) {
      await this.writeAuditLog(
        'AUTH_LOGIN_FAILED',
        'User',
        user.id,
        user.id,
        {
          reason: 'INVALID_PASSWORD',
        },
      );

      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const tokens = await this.issueTokens(user);

    await this.writeAuditLog(
      'AUTH_LOGIN',
      'User',
      user.id,
      user.id,
      {
        roles: tokens.user.roles,
      },
    );

    return tokens;
  }

  async refresh(refreshToken: string) {
    let payload: {
      sub: string;
      tokenType: string;
    };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
      );
    }

    if (
      payload.tokenType !== 'refresh' ||
      !payload.sub
    ) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    const tokenHash = this.hashRefreshToken(refreshToken);

    const storedToken =
      await this.prisma.refreshToken.findUnique({
        where: {
          tokenHash,
        },
      });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException(
        'Refresh token is no longer valid',
      );
    }

    const user = await this.getUserForAuth(payload.sub);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'User account is not active',
      );
    }

    await this.prisma.refreshToken.update({
      where: {
        id: storedToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const tokens = await this.issueTokens(user);

    await this.writeAuditLog(
      'AUTH_REFRESH',
      'User',
      user.id,
      user.id,
    );

    return tokens;
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash =
        this.hashRefreshToken(refreshToken);

      await this.prisma.refreshToken.updateMany({
        where: {
          tokenHash,
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    await this.writeAuditLog(
      'AUTH_LOGOUT',
      'User',
      userId,
      userId,
      {
        refreshTokenRevoked: Boolean(refreshToken),
      },
    );

    return {
      message: 'Logged out successfully',
    };
  }

  async me(userId: string) {
    const user = await this.getUserForAuth(userId);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'User account is not active',
      );
    }

    return this.buildAuthUser(user);
  }
}
