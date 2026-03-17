import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MediaService } from '../../../media/media.service';
import { JobsService } from '../../services/jobs.service';
import { LogsService } from '../../services/logs.service';
import { RUNTIME_QUEUES } from '../queue.constants';

@Processor(RUNTIME_QUEUES.TOPIC)
export class TopicProcessor extends WorkerHost {
  constructor(private readonly media: MediaService, private readonly jobs: JobsService, private readonly logs: LogsService) { super(); }

  async process(job: Job<{ runtimeJobId: string; workspaceId: string; count: number; sourceNotes?: string }>) {
    const { runtimeJobId, workspaceId, count, sourceNotes } = job.data;
    await this.jobs.markRunning(runtimeJobId);
    try {
      const rows = await this.media.generateTopics(workspaceId, count, sourceNotes);
      await this.jobs.setRuntimeJobStatus(runtimeJobId, 'succeeded', { created: rows.length });
      await this.logs.log(workspaceId, 'topic_batch_generated', `Generated ${rows.length} topics`, { runtimeJobId });
    } catch (error: any) {
      await this.jobs.setRuntimeJobStatus(runtimeJobId, 'failed', undefined, error.message);
      throw error;
    }
  }
}
