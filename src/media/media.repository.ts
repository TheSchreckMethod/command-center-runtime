import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';

@Injectable()
export class MediaRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async getTopUndraftedTopics(workspaceId: string, limit: number) {
    const { data, error } = await this.supabase.client
      .from('media_topics').select('*').eq('workspace_id', workspaceId)
      .eq('status', 'idea').order('score', { ascending: false }).limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  async getDraftedBriefsWithoutPosts(workspaceId: string, limit: number) {
    const { data, error } = await this.supabase.client
      .from('media_briefs').select('*').eq('workspace_id', workspaceId)
      .eq('status', 'drafted').limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  async getUnscheduledPosts(workspaceId: string, limit: number) {
    const { data, error } = await this.supabase.client
      .from('media_posts').select('*').eq('workspace_id', workspaceId)
      .eq('status', 'drafted').limit(limit);
    if (error) throw error;
    return data ?? [];
  }
}
