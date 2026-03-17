import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SupabaseService } from '../../../common/supabase.service';
import { JobsService } from '../../services/jobs.service';
import { AlertsService } from '../../services/alerts.service';
import { LogsService } from '../../services/logs.service';
import { RUNTIME_QUEUES } from '../queue.constants';

@Processor(RUNTIME_QUEUES.METRICS)
export class MetricsProcessor extends WorkerHost {
  constructor(private readonly supabase: SupabaseService, private readonly jobs: JobsService, private readonly alerts: AlertsService, private readonly logs: LogsService) { super(); }

  async process(job: Job<{ runtimeJobId: string; workspaceId: string }>) {
    const { runtimeJobId, workspaceId } = job.data;
    await this.jobs.markRunning(runtimeJobId);
    try {
      const { data: metrics, error } = await this.supabase.client.from('media_metrics').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      const totalRevenue = (metrics ?? []).reduce((sum, row: any) => sum + Number(row.revenue || 0), 0);
      if (totalRevenue > 1000) { await this.alerts.create(workspaceId, 'info', 'revenue', 'Revenue exceeded $1K in sample window.', { totalRevenue }); }
      await this.jobs.setRuntimeJobStatus(runtimeJobId, 'succeeded', { metricsChecked: metrics?.length || 0, totalRevenue });
      await this.logs.log(workspaceId, 'metrics_refreshed', `Revenue sample: ${totalRevenue}`, { runtimeJobId });
    } catch (error: any) { await this.jobs.setRuntimeJobStatus(runtimeJobId, 'failed', undefined, error.message); throw error; }
  }
}
