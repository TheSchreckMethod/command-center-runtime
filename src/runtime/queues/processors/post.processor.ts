import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MediaRepository } from '../../../media/media.repository';
import { MediaService } from '../../../media/media.service';
import { JobsService } from '../../services/jobs.service';
import { LogsService } from '../../services/logs.service';
import { RUNTIME_QUEUES } from '../queue.constants';

@Processor(RUNTIME_QUEUES.POST)
export class PostProcessor extends WorkerHost {
  constructor(private readonly mediaRepo: MediaRepository, private readonly media: MediaService, private readonly jobs: JobsService, private readonly logs: LogsService) { super(); }

  async process(job: Job<{ runtimeJobId: string; workspaceId: string; count: number }>) {
    const { runtimeJobId, workspaceId, count } = job.data;
    await this.jobs.markRunning(runtimeJobId);
    try {
      const briefs = await this.mediaRepo.getDraftedBriefsWithoutPosts(workspaceId, count);
      let created = 0;
      for (const brief of briefs) { const posts = await this.media.createPostsFromBrief(brief); created += posts.length; }
      await this.jobs.setRuntimeJobStatus(runtimeJobId, 'succeeded', { created });
      await this.logs.log(workspaceId, 'post_batch_generated', `Generated ${created} posts`, { runtimeJobId });
    } catch (error: any) { await this.jobs.setRuntimeJobStatus(runtimeJobId, 'failed', undefined, error.message); throw error; }
  }
}
