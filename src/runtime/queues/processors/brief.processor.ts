import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MediaRepository } from '../../../media/media.repository';
import { MediaService } from '../../../media/media.service';
import { JobsService } from '../../services/jobs.service';
import { LogsService } from '../../services/logs.service';
import { RUNTIME_QUEUES } from '../queue.constants';

@Processor(RUNTIME_QUEUES.BRIEF)
export class BriefProcessor extends WorkerHost {
  constructor(private readonly mediaRepo: MediaRepository, private readonly media: MediaService, private readonly jobs: JobsService, private readonly logs: LogsService) { super(); }

  async process(job: Job<{ runtimeJobId: string; workspaceId: string; count: number }>) {
    const { runtimeJobId, workspaceId, count } = job.data;
    await this.jobs.markRunning(runtimeJobId);
    try {
      const topics = await this.mediaRepo.getTopUndraftedTopics(workspaceId, count);
      for (const topic of topics) { await this.media.createBriefFromTopic(topic); }
      await this.jobs.setRuntimeJobStatus(runtimeJobId, 'succeeded', { created: topics.length });
      await this.logs.log(workspaceId, 'brief_batch_generated', `Generated ${topics.length} briefs`, { runtimeJobId });
    } catch (error: any) { await this.jobs.setRuntimeJobStatus(runtimeJobId, 'failed', undefined, error.message); throw error; }
  }
}
