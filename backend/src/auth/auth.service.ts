import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

type AuditContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_TTL_SECONDS =
    30 * 24 * 60 * 60;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async hashPassword(
    password: string,
  ): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async validatePassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(
      password,
      passwordHash,
    );
  }

  private hashRefreshToken(
    token: string,
  ): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  /**
   * Write authentication/security audit log.
   *
   * IMPORTANT:
   * - Never store password.
   * - Never store access token.
   * - Never store refresh token.
   */
  private async writeAuditLog(
    action: string,
    entity: string,
    entityId?: string,
    userId?: string,
    metadata?: Prisma.InputJsonValue,
    context?: AuditContext,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId ?? null,
        userId: userId ?? null,
        ipAddress:
          context?.ipAddress ?? null,
        userAgent:
          context?.userAgent ?? null,

        ...(metadata !== undefined
          ? {
              metadata,
            }
          : {}),
      },
    });
  }

  /**
   * Get complete user authentication data
   * including:
   * - roles
   * - permissions
   */
  private async getUserForAuth(
    userId: string,
  ) {
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

  /**
   * Convert database user to safe
   * authentication response.
   *
   * passwordHash is intentionally NOT returned.
   */
  private buildAuthUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,

      roles: user.roles.map(
        (item: any) =>
          item.role.name,
      ),

      permissions: [
        ...new Set(
          user.roles.flatMap(
            (item: any) =>
              item.role.permissions.map(
                (rolePermission: any) =>
                  rolePermission.permission.code,
              ),
          ),
        ),
      ],
    };
  }

  /**
   * Generate access token + refresh token.
   *
   * Refresh token is stored only
   * as SHA-256 hash.
   */
  private async issueTokens(user: any) {
    const authUser =
      this.buildAuthUser(user);

    const accessToken =
      await this.jwtService.signAsync({
        sub: authUser.id,
        email: authUser.email,
        roles: authUser.roles,
        tokenType: 'access',
      });

    const refreshToken =
      await this.jwtService.signAsync(
        {
          sub: authUser.id,
          tokenType: 'refresh',
        },
        {
          expiresIn:
            this.REFRESH_TOKEN_TTL_SECONDS,
        },
      );

    const refreshExpiresAt =
      new Date(
        Date.now() +
          this.REFRESH_TOKEN_TTL_SECONDS *
            1000,
      );

    await this.prisma.refreshToken.create({
      data: {
        tokenHash:
          this.hashRefreshToken(
            refreshToken,
          ),

        userId: authUser.id,

        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: authUser,
    };
  }

  /**
   * REGISTER
   */
  async register(
    dto: RegisterDto,
    context?: AuditContext,
  ) {
    const email = dto.email
      .trim()
      .toLowerCase();

    const existingUser =
      await this.prisma.user.findUnique({
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
          reason:
            'EMAIL_ALREADY_EXISTS',
        },
        context,
      );

      throw new ConflictException(
        'An account with this email already exists',
      );
    }

    const passwordHash =
      await this.hashPassword(
        dto.password,
      );

    const donorRole =
      await this.prisma.role.findUnique({
        where: {
          name: 'DONOR',
        },
      });

    if (!donorRole) {
      throw new ConflictException(
        'DONOR role is not configured',
      );
    }

    const user =
      await this.prisma.user.create({
        data: {
          email,

          phone:
            dto.phone?.trim() || null,

          fullName:
            dto.fullName.trim(),

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
        method: 'password',
        role: 'DONOR',
      },
      context,
    );

    return this.issueTokens(user);
  }

  /**
   * LOGIN
   */
  async login(
    dto: LoginDto,
    context?: AuditContext,
  ) {
    const email = dto.email
      .trim()
      .toLowerCase();

    const user =
      await this.prisma.user.findUnique({
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

    /**
     * User does not exist.
     */
    if (!user) {
      await this.writeAuditLog(
        'AUTH_LOGIN_FAILED',
        'User',
        undefined,
        undefined,
        {
          reason: 'USER_NOT_FOUND',
        },
        context,
      );

      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    /**
     * User exists but is not active.
     */
    if (user.status !== 'ACTIVE') {
      await this.writeAuditLog(
        'AUTH_LOGIN_FAILED',
        'User',
        user.id,
        user.id,
        {
          reason:
            'USER_NOT_ACTIVE',
          status: user.status,
        },
        context,
      );

      throw new UnauthorizedException(
        'User account is not active',
      );
    }

    /**
     * Validate password.
     */
    const validPassword =
      await this.validatePassword(
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
          reason:
            'INVALID_PASSWORD',
        },
        context,
      );

      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    /**
     * Login successful.
     */
    const tokens =
      await this.issueTokens(user);

    await this.writeAuditLog(
      'AUTH_LOGIN',
      'User',
      user.id,
      user.id,
      {
        method: 'password',
        roles: tokens.user.roles,
      },
      context,
    );

    return tokens;
  }

  /**
   * REFRESH TOKEN
   */
  async refresh(
    refreshToken: string,
    context?: AuditContext,
  ) {
    let payload: {
      sub: string;
      tokenType: string;
    };

    /**
     * Verify JWT signature and expiration.
     */
    try {
      payload =
        await this.jwtService.verifyAsync(
          refreshToken,
        );
    } catch {
      await this.writeAuditLog(
        'AUTH_REFRESH_FAILED',
        'RefreshToken',
        undefined,
        undefined,
        {
          reason:
            'INVALID_OR_EXPIRED_TOKEN',
        },
        context,
      );

      throw new UnauthorizedException(
        'Invalid or expired refresh token',
      );
    }

    /**
     * Ensure this is actually
     * a refresh token.
     */
    if (
      payload.tokenType !==
        'refresh' ||
      !payload.sub
    ) {
      await this.writeAuditLog(
        'AUTH_REFRESH_FAILED',
        'RefreshToken',
        undefined,
        undefined,
        {
          reason:
            'INVALID_TOKEN_TYPE',
        },
        context,
      );

      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    const tokenHash =
      this.hashRefreshToken(
        refreshToken,
      );

    /**
     * Find refresh token in database.
     */
    const storedToken =
      await this.prisma.refreshToken.findUnique(
        {
          where: {
            tokenHash,
          },
        },
      );

    /**
     * Token doesn't exist,
     * already revoked,
     * or has expired.
     */
    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <=
        new Date()
    ) {
      await this.writeAuditLog(
        'AUTH_REFRESH_FAILED',
        'RefreshToken',
        storedToken?.id,
        storedToken?.userId,
        {
          reason: !storedToken
            ? 'TOKEN_NOT_FOUND'
            : storedToken.revokedAt
              ? 'TOKEN_REVOKED'
              : 'TOKEN_EXPIRED',
        },
        context,
      );

      throw new UnauthorizedException(
        'Refresh token is no longer valid',
      );
    }

    /**
     * Get user associated with token.
     */
    const user =
      await this.getUserForAuth(
        payload.sub,
      );

    if (
      !user ||
      user.status !== 'ACTIVE'
    ) {
      await this.writeAuditLog(
        'AUTH_REFRESH_FAILED',
        'User',
        payload.sub,
        payload.sub,
        {
          reason: !user
            ? 'USER_NOT_FOUND'
            : 'USER_NOT_ACTIVE',
        },
        context,
      );

      throw new UnauthorizedException(
        'User account is not active',
      );
    }

    /**
     * Revoke old refresh token.
     */
    await this.prisma.refreshToken.update(
      {
        where: {
          id: storedToken.id,
        },

        data: {
          revokedAt: new Date(),
        },
      },
    );

    /**
     * Issue new token pair.
     */
    const tokens =
      await this.issueTokens(user);

    await this.writeAuditLog(
      'AUTH_REFRESH',
      'User',
      user.id,
      user.id,
      {
        method:
          'refresh_token',
      },
      context,
    );

    return tokens;
  }

  /**
   * LOGOUT
   */
  async logout(
    userId: string,
    refreshToken?: string,
    context?: AuditContext,
  ) {
    /**
     * Logout specific refresh token.
     */
    if (refreshToken) {
      const tokenHash =
        this.hashRefreshToken(
          refreshToken,
        );

      await this.prisma.refreshToken.updateMany(
        {
          where: {
            tokenHash,
            userId,
            revokedAt: null,
          },

          data: {
            revokedAt: new Date(),
          },
        },
      );
    } else {
      /**
       * Revoke all refresh tokens
       * belonging to this user.
       */
      await this.prisma.refreshToken.updateMany(
        {
          where: {
            userId,
            revokedAt: null,
          },

          data: {
            revokedAt: new Date(),
          },
        },
      );
    }

    await this.writeAuditLog(
      'AUTH_LOGOUT',
      'User',
      userId,
      userId,
      {
        method: refreshToken
          ? 'refresh_token'
          : 'all_refresh_tokens',
      },
      context,
    );

    return {
      message:
        'Logged out successfully',
    };
  }

  /**
   * GET CURRENT USER
   */
  async me(userId: string) {
    const user =
      await this.getUserForAuth(
        userId,
      );

    if (
      !user ||
      user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException(
        'User account is not active',
      );
    }

    return this.buildAuthUser(user);
  }
}
