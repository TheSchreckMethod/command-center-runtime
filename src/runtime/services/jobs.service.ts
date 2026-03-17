import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SupabaseService } from '../../common/supabase.service';
import { RUNTIME_JOBS, RUNTIME_QUEUES } from '../queues/queue.constants';

@Injectable()
export class JobsService {
  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue(RUNTIME_QUEUES.TOPIC) private readonly topicQueue: Queue,
    @InjectQueue(RUNTIME_QUEUES.BRIEF) private readonly briefQueue: Queue,
    @InjectQueue(RUNTIME_QUEUES.POST) private readonly postQueue: Queue,
    @InjectQueue(RUNTIME_QUEUES.SCHEDULE) private readonly scheduleQueue: Queue,
    @InjectQueue(RUNTIME_QUEUES.METRICS) private readonly metricsQueue: Queue,
  ) {}

  async createRuntimeJob(workspaceId: string, jobType: string, payload: Record<string, unknown>) {
    const { data, error } = await this.supabase.client.from('runtime_jobs').insert({ workspace_id: workspaceId, job_type: jobType, status: 'queued', payload }).select('*').single();
    if (error) throw error;
    return data;
  }

  async queueGenerateTopics(workspaceId: string, count = 20, sourceNotes?: string) {
    const job = await this.createRuntimeJob(workspaceId, RUNTIME_JOBS.GENERATE_TOPICS, { count, sourceNotes });
    await this.topicQueue.add(RUNTIME_JOBS.GENERATE_TOPICS, { runtimeJobId: job.id, workspaceId, count, sourceNotes });
    return job;
  }

  async queueCreateBriefs(workspaceId: string, count = 10) {
    const job = await this.createRuntimeJob(workspaceId, RUNTIME_JOBS.CREATE_BRIEFS, { count });
    await this.briefQueue.add(RUNTIME_JOBS.CREATE_BRIEFS, { runtimeJobId: job.id, workspaceId, count });
    return job;
  }

  async queueGeneratePosts(workspaceId: string, count = 10) {
    const job = await this.createRuntimeJob(workspaceId, RUNTIME_JOBS.GENERATE_POSTS, { count });
    await this.postQueue.add(RUNTIME_JOBS.GENERATE_POSTS, { runtimeJobId: job.id, workspaceId, count });
    return job;
  }

  async queueScheduleContent(workspaceId: string, horizonDays = 7) {
    const job = await this.createRuntimeJob(workspaceId, RUNTIME_JOBS.SCHEDULE_CONTENT, { horizonDays });
    await this.scheduleQueue.add(RUNTIME_JOBS.SCHEDULE_CONTENT, { runtimeJobId: job.id, workspaceId, horizonDays });
    return job;
  }

  async queueRefreshMetrics(workspaceId: string) {
    const job = await this.createRuntimeJob(workspaceId, RUNTIME_JOBS.REFRESH_METRICS, {});
    await this.metricsQueue.add(RUNTIME_JOBS.REFRESH_METRICS, { runtimeJobId: job.id, workspaceId });
    return job;
  }

  async setRuntimeJobStatus(runtimeJobId: string, status: string, result?: Record<string, unknown>, errorMessage?: string) {
    const payload: Record<string, unknown> = { status, ended_at: ['succeeded', 'failed'].includes(status) ? new Date().toISOString() : null };
    if (result) payload.result = result;
    if (errorMessage) payload.error_message = errorMessage;
    await this.supabase.client.from('runtime_jobs').update(payload).eq('id', runtimeJobId);
  }

  async markRunning(runtimeJobId: string) {
    await this.supabase.client.from('runtime_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runtimeJobId);
  }

  async list(workspaceId: string) {
    const { data, error } = await this.supabase.client.from('runtime_jobs').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return data ?? [];
  }
}
