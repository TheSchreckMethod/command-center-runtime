import { Injectable } from '@nestjs/common';
import { JobsService } from './services/jobs.service';
import { SummaryService } from './services/summary.service';
import { SettingsService } from './services/settings.service';
import { AlertsService } from './services/alerts.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class RuntimeService {
  constructor(private readonly jobs: JobsService, private readonly summary: SummaryService, private readonly settings: SettingsService, private readonly alerts: AlertsService) {}

  getSummary(ws: string) { return this.summary.get(ws); }
  getJobs(ws: string) { return this.jobs.list(ws); }
  getAlerts(ws: string) { return this.alerts.list(ws); }
  getSettings(ws: string) { return this.settings.get(ws); }
  updateSettings(ws: string, dto: UpdateSettingsDto) { return this.settings.update(ws, dto); }
  triggerGenerateTopics(ws: string, count?: number, notes?: string) { return this.jobs.queueGenerateTopics(ws, count || 20, notes); }
  triggerCreateBriefs(ws: string, count?: number) { return this.jobs.queueCreateBriefs(ws, count || 10); }
  triggerGeneratePosts(ws: string, count?: number) { return this.jobs.queueGeneratePosts(ws, count || 10); }
  triggerScheduleContent(ws: string, days?: number) { return this.jobs.queueScheduleContent(ws, days || 7); }
  triggerRefreshMetrics(ws: string) { return this.jobs.queueRefreshMetrics(ws); }
}
