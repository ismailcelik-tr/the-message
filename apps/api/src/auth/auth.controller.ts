import { Controller, Delete, Headers, HttpCode, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiResponse } from '@the-message/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Delete('account')
  @HttpCode(200)
  async deleteAccount(
    @Headers('authorization') authHeader?: string,
  ): Promise<ApiResponse<null>> {
    if (!authHeader) throw new UnauthorizedException('Authorization header required');
    await this.authService.deleteAccount(authHeader);
    return { success: true, data: null };
  }
}
