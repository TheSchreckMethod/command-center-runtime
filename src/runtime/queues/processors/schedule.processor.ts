import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MediaRepository } from '../../../media/media.repository';
import { SupabaseService } from '../../../common/supabase.service';
import { JobsService } from '../../services/jobs.service';
import { AlertsService } from '../../services/alerts.service';
import { LogsService } from '../../services/logs.service';
import { RUNTIME_QUEUES } from '../queue.constants';

@Processor(RUNTIME_QUEUES.SCHEDULE)
export class ScheduleProcessor extends WorkerHost {
  constructor(private readonly mediaRepo: MediaRepository, private readonly supabase: SupabaseService, private readonly jobs: JobsService, private readonly alerts: AlertsService, private readonly logs: LogsService) { super(); }

  async process(job: Job<{ runtimeJobId: string; workspaceId: string; horizonDays: number }>) {
    const { runtimeJobId, workspaceId, horizonDays } = job.data;
    await this.jobs.markRunning(runtimeJobId);
    try {
      const posts = await this.mediaRepo.getUnscheduledPosts(workspaceId, horizonDays * 5);
      const start = new Date();
      let index = 0;
      for (const post of posts) {
        const scheduled = new Date(start.getTime() + index * 4 * 60 * 60 * 1000).toISOString();
        await this.supabase.client.from('media_posts').update({ status: 'scheduled', scheduled_for: scheduled }).eq('id', post.id);
        await this.supabase.client.from('media_publish_jobs').insert({ workspace_id: workspaceId, post_id: post.id, platform: post.platform, payload: post, status: 'queued', scheduled_for: scheduled });
        index += 1;
      }
      if (posts.length < 5) { await this.alerts.create(workspaceId, 'warning', 'schedule', 'Low scheduled content volume detected.', { scheduledCount: posts.length }); }
      await this.jobs.setRuntimeJobStatus(runtimeJobId, 'succeeded', { scheduled: posts.length });
      await this.logs.log(workspaceId, 'content_scheduled', `Scheduled ${posts.length} posts`, { runtimeJobId });
    } catch (error: any) { await this.jobs.setRuntimeJobStatus(runtimeJobId, 'failed', undefined, error.message); throw error; }
  }
}
