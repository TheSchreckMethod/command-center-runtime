import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JobsService } from './jobs.service';
import { SettingsService } from './settings.service';

@Injectable()
export class SchedulerService {
  constructor(private readonly jobs: JobsService, private readonly settings: SettingsService) {}
  private get workspaceId() { return process.env.DEFAULT_WORKSPACE_ID!; }

  @Cron('0 6 * * *')
  async generateTopicBatch() {
    const s = await this.settings.get(this.workspaceId);
    if (!s.autonomous_mode) return;
    await this.jobs.queueGenerateTopics(this.workspaceId, s.daily_topic_target);
  }

  @Cron('15 6 * * *')
  async generateBriefs() {
    const s = await this.settings.get(this.workspaceId);
    if (!s.autonomous_mode) return;
    await this.jobs.queueCreateBriefs(this.workspaceId, s.daily_brief_target);
  }

  @Cron('30 6 * * *')
  async generatePosts() {
    const s = await this.settings.get(this.workspaceId);
    if (!s.autonomous_mode) return;
    await this.jobs.queueGeneratePosts(this.workspaceId, s.daily_post_target);
  }

  @Cron('45 6 * * *')
  async scheduleContent() {
    const s = await this.settings.get(this.workspaceId);
    if (!s.autonomous_mode) return;
    await this.jobs.queueScheduleContent(this.workspaceId, s.schedule_horizon_days);
  }

  @Cron('0 20 * * *')
  async refreshMetrics() {
    const s = await this.settings.get(this.workspaceId);
    if (!s.autonomous_mode) return;
    await this.jobs.queueRefreshMetrics(this.workspaceId);
  }
}
