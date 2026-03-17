import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   COMMAND CENTER RUNTIME v3.1                ║
  ║   Strength. Systems. Permanence.             ║
  ║   Running on port ${port}                      ║
  ╚══════════════════════════════════════════════╝
  `);
}
bootstrap();
