import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RuntimeModule } from './runtime/runtime.module';
import { MediaModule } from './media/media.module';
import { PublishersModule } from './publishers/publishers.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envValidationSchema.parse(config),
    }),
    ScheduleModule.forRoot(),
    RuntimeModule,
    MediaModule,
    PublishersModule,
  ],
})
export class AppModule {}
