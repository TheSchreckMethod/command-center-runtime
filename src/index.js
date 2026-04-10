const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3002;

// ============================================================
// SUPABASE — defaults baked in (RLS disabled on all media tables)
// ============================================================
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

if (!process.env.DEFAULT_WORKSPACE_ID) {
  throw new Error('DEFAULT_WORKSPACE_ID must be set');
}
const WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID;

// ============================================================
// OPENAI HELPER
// ============================================================
async function callOpenAI(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o', response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.7, max_tokens: 4000
    })
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content || '{}');
}

// ============================================================
// TOPIC SCORING
// ============================================================
function scoreTopic(t) {
  let s = 50;
  const text = `${t.title} ${t.angle} ${t.hook} ${t.theme}`.toLowerCase();
  if (text.includes('founder')) s += 8;
  if (text.includes('burnout')) s += 8;
  if (text.includes('identity')) s += 7;
  if (text.includes('pressure')) s += 7;
  if (text.includes('decision')) s += 6;
  if (text.includes('governance')) s += 7;
  if (text.includes('resilience')) s += 6;
  if ((t.targetPersona || '').toLowerCase().includes('founder')) s += 6;
  return Math.min(s, 100);
}

// ============================================================
// PROMPTS
// ============================================================
const PROMPTS = {
  topics: 'You are a media strategist for The Schreck Method. Generate Founder Intelligence Brief topics. Return JSON with a top-level "topics" array. Each: title, angle, hook, targetPersona, sourceKind, sourceRef, theme. Voice: calm, direct, institutional. No generic motivation.',
  brief: 'Create an Intelligence Brief. Return JSON: title, thesis, hook, outline (array), cta, script. Tone: elite, strategic, calm, direct. Audience: founders under pressure.',
  posts: 'Transform an Intelligence Brief into platform-native posts. Return JSON with keys: youtube, youtube_shorts, linkedin, x, instagram, facebook. Each has title and body. No hashtags on LinkedIn. No emoji.'
};

// ============================================================
// HEALTH
// ============================================================
app.get('/api/runtime/health', async (req, res) => {
  let dbOk = false;
  try { const { count } = await supabase.from('workspaces').select('*', { count: 'exact', head: true }); dbOk = true; } catch(e) {}
  res.json({
    status: 'operational', service: 'command-center-runtime', version: '3.1.1',
    uptime: process.uptime(), supabase: dbOk, workspace: WORKSPACE_ID,
    openai: !!process.env.OPENAI_API_KEY
  });
});

// ============================================================
// STATUS
// ============================================================
app.get('/api/runtime/status', async (req, res) => {
  try {
    const [topics, briefs, posts, jobs, metrics] = await Promise.all([
      supabase.from('media_topics').select('id', { count: 'exact', head: true }),
      supabase.from('media_briefs').select('id', { count: 'exact', head: true }),
      supabase.from('media_posts').select('id', { count: 'exact', head: true }),
      supabase.from('media_publish_jobs').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
      supabase.from('media_metrics').select('id', { count: 'exact', head: true }),
    ]);
    res.json({ status: 'operational', workspace: WORKSPACE_ID, counts: {
      topics: topics.count || 0, briefs: briefs.count || 0, posts: posts.count || 0,
      queued_jobs: jobs.count || 0, metrics: metrics.count || 0
    }});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// GENERATE TOPICS
// ============================================================
app.post('/api/runtime/topics/generate', async (req, res) => {
  try {
    const { count = 20, sourceNotes } = req.body || {};
    const parsed = await callOpenAI(PROMPTS.topics,
      `Generate ${count} topics. Context: ${sourceNotes || 'Founder pain, resilience, governance, ICA, Schreck Method.'}`);
    const rows = (parsed.topics || []).map(t => ({
      workspace_id: WORKSPACE_ID, title: t.title, angle: t.angle, hook: t.hook,
      target_persona: t.targetPersona, source_kind: t.sourceKind || 'ai',
      source_ref: t.sourceRef || null, theme: t.theme || 'general',
      score: scoreTopic(t), status: 'idea'
    }));
    const { data, error } = await supabase.from('media_topics').insert(rows).select('*');
    if (error) throw error;
    res.json({ ok: true, generated: data.length, topics: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// LIST TOPICS
app.get('/api/runtime/topics', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    let q = supabase.from('media_topics').select('*').order('score', { ascending: false }).limit(limit);
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ topics: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// CREATE BRIEF
// ============================================================
app.post('/api/runtime/briefs/create', async (req, res) => {
  try {
    const { topicId, briefType = 'long_form_video' } = req.body || {};
    if (!topicId) return res.status(400).json({ error: 'topicId required' });
    const { data: topic, error: tErr } = await supabase.from('media_topics').select('*').eq('id', topicId).single();
    if (tErr) throw tErr;
    const parsed = await callOpenAI(PROMPTS.brief, JSON.stringify(topic));
    const { data: brief, error: bErr } = await supabase.from('media_briefs').insert({
      workspace_id: WORKSPACE_ID, topic_id: topicId, type: briefType, title: parsed.title,
      thesis: parsed.thesis, hook: parsed.hook, outline: parsed.outline || [],
      cta: parsed.cta, script: parsed.script || null, status: 'drafted'
    }).select('*').single();
    if (bErr) throw bErr;
    await supabase.from('media_topics').update({ status: 'drafted' }).eq('id', topicId);
    res.json({ ok: true, brief });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// LIST BRIEFS
app.get('/api/runtime/briefs', async (req, res) => {
  try {
    const { data, error } = await supabase.from('media_briefs').select('*').order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    res.json({ briefs: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// GENERATE POSTS
// ============================================================
app.post('/api/runtime/posts/generate', async (req, res) => {
  try {
    const { briefId } = req.body || {};
    if (!briefId) return res.status(400).json({ error: 'briefId required' });
    const { data: brief, error: bErr } = await supabase.from('media_briefs').select('*').eq('id', briefId).single();
    if (bErr) throw bErr;
    const parsed = await callOpenAI(PROMPTS.posts, JSON.stringify(brief));
    const platforms = ['youtube', 'youtube_shorts', 'linkedin', 'x', 'instagram', 'facebook'];
    const rows = platforms.filter(p => parsed[p]).map(p => ({
      workspace_id: WORKSPACE_ID, brief_id: briefId, platform: p,
      title: parsed[p].title || null, body: parsed[p].body || '', status: 'drafted'
    }));
    const { data, error } = await supabase.from('media_posts').insert(rows).select('*');
    if (error) throw error;
    res.json({ ok: true, generated: data.length, posts: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// LIST POSTS
app.get('/api/runtime/posts', async (req, res) => {
  try {
    let q = supabase.from('media_posts').select('*').order('created_at', { ascending: false }).limit(50);
    if (req.query.platform) q = q.eq('platform', req.query.platform);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ posts: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// METRICS
// ============================================================
app.post('/api/runtime/metrics/ingest', async (req, res) => {
  try {
    const { postId, platform, externalId, impressions=0, clicks=0, comments=0,
      reactions=0, saves=0, watchTimeSeconds=0, purchases=0, revenue=0 } = req.body || {};
    if (!platform || !externalId) return res.status(400).json({ error: 'platform and externalId required' });
    const { data, error } = await supabase.from('media_metrics').insert({
      workspace_id: WORKSPACE_ID, post_id: postId || null, platform, external_id: externalId,
      impressions, clicks, comments, reactions, saves, watch_time_seconds: watchTimeSeconds, purchases, revenue
    }).select('*').single();
    if (error) throw error;
    res.json({ ok: true, metric: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/runtime/metrics', async (req, res) => {
  try {
    const { data, error } = await supabase.from('media_metrics').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    const totals = (data || []).reduce((a, r) => {
      a.impressions += r.impressions||0; a.clicks += r.clicks||0;
      a.purchases += r.purchases||0; a.revenue += parseFloat(r.revenue)||0; return a;
    }, { impressions:0, clicks:0, purchases:0, revenue:0 });
    res.json({ totals, metrics: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// FULL PIPELINE: ONE-CLICK
// ============================================================
app.post('/api/runtime/pipeline/run', async (req, res) => {
  try {
    const { count = 5, sourceNotes } = req.body || {};
    // Step 1: Topics
    const topicsResult = await callOpenAI(PROMPTS.topics,
      `Generate ${count} topics. Context: ${sourceNotes || 'Founder pain, resilience, governance, ICA.'}`);
    const topicRows = (topicsResult.topics || []).map(t => ({
      workspace_id: WORKSPACE_ID, title: t.title, angle: t.angle, hook: t.hook,
      target_persona: t.targetPersona, source_kind: t.sourceKind || 'ai',
      source_ref: t.sourceRef || null, theme: t.theme || 'general', score: scoreTopic(t), status: 'idea'
    }));
    const { data: topics, error: tErr } = await supabase.from('media_topics').insert(topicRows).select('*');
    if (tErr) throw tErr;

    // Step 2: Brief from top topic
    const top = topics.sort((a, b) => b.score - a.score)[0];
    const briefResult = await callOpenAI(PROMPTS.brief, JSON.stringify(top));
    const { data: brief, error: bErr } = await supabase.from('media_briefs').insert({
      workspace_id: WORKSPACE_ID, topic_id: top.id, type: 'long_form_video', title: briefResult.title,
      thesis: briefResult.thesis, hook: briefResult.hook, outline: briefResult.outline || [],
      cta: briefResult.cta, script: briefResult.script || null, status: 'drafted'
    }).select('*').single();
    if (bErr) throw bErr;
    await supabase.from('media_topics').update({ status: 'drafted' }).eq('id', top.id);

    // Step 3: Platform posts
    const postsResult = await callOpenAI(PROMPTS.posts, JSON.stringify(brief));
    const platforms = ['youtube', 'youtube_shorts', 'linkedin', 'x', 'instagram', 'facebook'];
    const postRows = platforms.filter(p => postsResult[p]).map(p => ({
      workspace_id: WORKSPACE_ID, brief_id: brief.id, platform: p,
      title: postsResult[p].title || null, body: postsResult[p].body || '', status: 'drafted'
    }));
    const { data: posts, error: pErr } = await supabase.from('media_posts').insert(postRows).select('*');
    if (pErr) throw pErr;

    res.json({
      ok: true,
      pipeline: { topics_generated: topics.length, brief_title: brief.title, posts_drafted: posts.length,
        platforms: posts.map(p => p.platform) },
      topic: top, brief, posts
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// BOOT
// ============================================================
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   COMMAND CENTER RUNTIME v3.1.1              ║
  ║   Strength. Systems. Permanence.             ║
  ║   Port ${PORT}                                  ║
  ╚══════════════════════════════════════════════╝
  `);
});
