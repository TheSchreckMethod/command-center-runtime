import { Module } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';
import { OpenAiService } from '../common/openai.service';
import { MediaModule } from '../media/media.module';
import { QueueModule } from './queues/queue.module';
import { RuntimeController } from './runtime.controller';
import { RuntimeService } from './runtime.service';
import { SummaryService } from './services/summary.service';
import { SettingsService } from './services/settings.service';
import { AlertsService } from './services/alerts.service';
import { LogsService } from './services/logs.service';
import { JobsService } from './services/jobs.service';
import { SchedulerService } from './services/scheduler.service';

@Module({
  imports: [MediaModule, QueueModule],
  controllers: [RuntimeController],
  providers: [SupabaseService, OpenAiService, RuntimeService, SummaryService, SettingsService, AlertsService, LogsService, JobsService, SchedulerService],
})
export class RuntimeModule {}
