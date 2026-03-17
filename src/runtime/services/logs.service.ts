import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase.service';

@Injectable()
export class LogsService {
  constructor(private readonly supabase: SupabaseService) {}

  async log(workspaceId: string, eventType: string, message: string, metadata: Record<string, unknown> = {}) {
    await this.supabase.client.from('runtime_logs').insert({ workspace_id: workspaceId, event_type: eventType, message, metadata });
  }
}
