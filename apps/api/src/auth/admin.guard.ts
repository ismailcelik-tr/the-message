import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly db: SupabaseClient;

  constructor() {
    this.db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { realtime: { transport: ws as any } },
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string | undefined;
    const secretHeader = request.headers['x-admin-push-secret'] as string | undefined;

    // 1. Backwards compatibility: Check against legacy ADMIN_PUSH_SECRET
    const configuredSecret = process.env.ADMIN_PUSH_SECRET;
    if (configuredSecret) {
      if (secretHeader === configuredSecret) {
        return true;
      }
      const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
      if (bearer === configuredSecret) {
        return true;
      }
    }

    // 2. JWT validation via Supabase Auth
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await this.db.auth.getUser(token);

    if (authError || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // 3. User authorization: Check admin role in profiles table
    const { data: profile, error: profileError } = await this.db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      throw new UnauthorizedException('Access denied. Admin role required.');
    }

    // Add verified user to the request object
    request.user = user;
    return true;
  }
}
