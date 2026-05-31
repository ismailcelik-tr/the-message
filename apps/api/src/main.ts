import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for mobile application connections
  app.enableCors();
  
  // Apply api prefix for all controller endpoints, excluding static admin path
  app.setGlobalPrefix('api', { exclude: ['admin'] });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[Çağrı/The Message] API is running on: http://localhost:${port}/api`);
}
bootstrap();
