import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

@Injectable()
export class AuthService {
  private readonly adminClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { realtime: { transport: ws as any } },
  );

  async deleteAccount(authHeader: string): Promise<void> {
    // Verify the user's JWT to get their ID
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await this.adminClient.auth.getUser(token);

    if (authError || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Delete the user via admin API — cascades to all user data
    const { error } = await this.adminClient.auth.admin.deleteUser(user.id);
    if (error) throw error;
  }
}
