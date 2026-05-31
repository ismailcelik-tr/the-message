import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { AuthModule } from '../auth/auth.module';
import { ContentModule } from '../content/content.module';

@Module({
  imports: [AuthModule, ContentModule],
  controllers: [PushController],
  providers: [PushService],
})
export class PushModule {}
