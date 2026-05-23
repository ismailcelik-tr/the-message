import { Injectable } from '@nestjs/common';
import { DailyMessage } from '@the-message/shared';

@Injectable()
export class AppService {
  getPlaceholderDailyMessage(): DailyMessage {
    return {
      id: '1',
      content: 'Kalpler yalnızca Allah’ı anmakla huzur bulur.',
      source: 'Rad Suresi, 28. Ayet',
      category: 'hope',
      recommendedTime: 'any',
      date: new Date().toISOString().split('T')[0],
    };
  }
}
