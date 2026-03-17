import { Injectable } from '@nestjs/common';
import { OpenAiService } from '../common/openai.service';
import { SupabaseService } from '../common/supabase.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly openai: OpenAiService,
    private readonly supabase: SupabaseService,
  ) {}

  async generateTopics(workspaceId: string, count = 20, sourceNotes?: string) {
    const completion = await this.openai.client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a media strategist for The Schreck Method. Generate Founder Intelligence Brief topics. Return JSON with a top-level topics array containing title, angle, hook, targetPersona, sourceKind, sourceRef, theme. Voice: calm, direct, institutional. No generic motivation.' },
        { role: 'user', content: `Generate ${count} topics. Context: ${sourceNotes || 'Founder pressure, identity, resilience, governance, ICA, structural discipline.'}` },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{"topics":[]}');
    const rows = (parsed.topics || []).map((topic: any) => ({
      workspace_id: workspaceId, title: topic.title, angle: topic.angle, hook: topic.hook,
      target_persona: topic.targetPersona, source_kind: topic.sourceKind || 'manual',
      source_ref: topic.sourceRef || null, theme: topic.theme || 'general', score: 75, status: 'idea',
    }));

    const { data, error } = await this.supabase.client.from('media_topics').insert(rows).select('*');
    if (error) throw error;
    return data;
  }

  async createBriefFromTopic(topic: any) {
    const completion = await this.openai.client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Create an Intelligence Brief. Return JSON with title, thesis, hook, outline, cta, script. Tone: elite, strategic, calm, direct. No fluff. Institutional authority.' },
        { role: 'user', content: JSON.stringify(topic) },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const { data, error } = await this.supabase.client.from('media_briefs').insert({
      workspace_id: topic.workspace_id, topic_id: topic.id, type: 'long_form_video',
      title: parsed.title, thesis: parsed.thesis, hook: parsed.hook,
      outline: parsed.outline || [], cta: parsed.cta, script: parsed.script || null, status: 'drafted',
    }).select('*').single();
    if (error) throw error;

    await this.supabase.client.from('media_topics').update({ status: 'drafted' }).eq('id', topic.id);
    return data;
  }

  async createPostsFromBrief(brief: any) {
    const completion = await this.openai.client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Transform an Intelligence Brief into platform-native posts. Return JSON with youtube, youtube_shorts, linkedin, x, instagram, facebook. Each value: title and body. Preserve brand tone. No hashtags on LinkedIn. No emoji.' },
        { role: 'user', content: JSON.stringify(brief) },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const platforms = ['youtube', 'youtube_shorts', 'linkedin', 'x', 'instagram', 'facebook'];
    const rows = platforms.map((platform) => ({
      workspace_id: brief.workspace_id, brief_id: brief.id, platform,
      title: parsed[platform]?.title || null, body: parsed[platform]?.body || '', status: 'drafted',
    }));

    const { data, error } = await this.supabase.client.from('media_posts').insert(rows).select('*');
    if (error) throw error;
    return data;
  }
}
