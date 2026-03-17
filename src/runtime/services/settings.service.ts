import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.service';
import { UpdateSettingsDto } from '../dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly supabase: SupabaseService) {}

  async get(workspaceId: string) {
    const { data, error } = await this.supabase.client.from('runtime_settings').select('*').eq('workspace_id', workspaceId).single();
    if (error && error.code !== 'PGRST116') throw error;
    if (data) return data;
    const { data: created, error: createError } = await this.supabase.client.from('runtime_settings').insert({
      workspace_id: workspaceId, autonomous_mode: true, operator_mode: true, safe_mode: true,
      daily_topic_target: 20, daily_brief_target: 10, daily_post_target: 30, schedule_horizon_days: 7,
    }).select('*').single();
    if (createError) throw createError;
    return created;
  }

  async update(workspaceId: string, dto: UpdateSettingsDto) {
    const payload: Record<string, unknown> = {};
    if (dto.autonomousMode !== undefined) payload.autonomous_mode = dto.autonomousMode;
    if (dto.operatorMode !== undefined) payload.operator_mode = dto.operatorMode;
    if (dto.safeMode !== undefined) payload.safe_mode = dto.safeMode;
    if (dto.dailyTopicTarget !== undefined) payload.daily_topic_target = dto.dailyTopicTarget;
    if (dto.dailyBriefTarget !== undefined) payload.daily_brief_target = dto.dailyBriefTarget;
    if (dto.dailyPostTarget !== undefined) payload.daily_post_target = dto.dailyPostTarget;
    if (dto.scheduleHorizonDays !== undefined) payload.schedule_horizon_days = dto.scheduleHorizonDays;
    const { data, error } = await this.supabase.client.from('runtime_settings').update(payload).eq('workspace_id', workspaceId).select('*').single();
    if (error) throw error;
    return data;
  }
}
