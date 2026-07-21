import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Enable CORS for React frontend requests
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend server running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
