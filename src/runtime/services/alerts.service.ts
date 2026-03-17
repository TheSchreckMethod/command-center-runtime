import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.service';

@Injectable()
export class AlertsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(workspaceId: string, severity: 'info' | 'warning' | 'critical', category: string, message: string, metadata: Record<string, unknown> = {}) {
    const { data, error } = await this.supabase.client.from('runtime_alerts').insert({ workspace_id: workspaceId, severity, category, message, metadata, is_resolved: false }).select('*').single();
    if (error) throw error;
    return data;
  }

  async list(workspaceId: string) {
    const { data, error } = await this.supabase.client.from('runtime_alerts').select('*').eq('workspace_id', workspaceId).eq('is_resolved', false).order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return data ?? [];
  }
}
