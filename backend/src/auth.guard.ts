import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SupabaseService } from './supabase.service';

/**
 * Verifies the Supabase access token sent as `Authorization: Bearer <jwt>` and
 * attaches the matching database user to `request.user`. If the Supabase account
 * exists but has no database row yet (e.g. created from the dashboard), a row is
 * created from the account's metadata so login never dead-ends.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new UnauthorizedException('Sign in to continue');

    const { data, error } = await this.supabaseService.getClient().auth.getUser(token);
    if (error || !data.user?.email) {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }

    const email = data.user.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      const meta = data.user.user_metadata || {};
      user = await this.prisma.user.create({
        data: {
          email,
          password: 'managed_by_supabase',
          full_name: meta.full_name || email.split('@')[0],
          role: meta.role === 'supervisor' ? 'supervisor' : 'student',
        },
      });
    }

    req.user = user;
    return true;
  }
}
