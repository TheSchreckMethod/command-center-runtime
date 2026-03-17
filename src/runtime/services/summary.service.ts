import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.service';

@Injectable()
export class SummaryService {
  constructor(private readonly supabase: SupabaseService) {}

  async get(workspaceId: string) {
    const [metricsRes, postsRes, topicsRes, jobsRes] = await Promise.all([
      this.supabase.client.from('media_metrics').select('revenue, purchases, clicks', { count: 'exact' }).eq('workspace_id', workspaceId),
      this.supabase.client.from('media_posts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      this.supabase.client.from('media_topics').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      this.supabase.client.from('runtime_jobs').select('status', { count: 'exact' }).eq('workspace_id', workspaceId),
    ]);
    const metrics = metricsRes.data ?? [];
    const revenue = metrics.reduce((sum, row: any) => sum + Number(row.revenue || 0), 0);
    const conversions = metrics.reduce((sum, row: any) => sum + Number(row.purchases || 0), 0);
    const clicks = metrics.reduce((sum, row: any) => sum + Number(row.clicks || 0), 0);
    const failedJobs = (jobsRes.data ?? []).filter((j: any) => j.status === 'failed').length;
    return { revenue, posts: postsRes.count || 0, topics: topicsRes.count || 0, conversions, queueHealth: Math.max(0, 100 - failedJobs * 15), automationRuns: jobsRes.count || 0, clickThroughVolume: clicks };
  }
}
