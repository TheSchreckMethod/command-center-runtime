// ============================================================
// COMMAND CENTER RUNTIME v3.1
// Express + BullMQ + Supabase + OpenAI
// Autonomous content pipeline for The Schreck Method
// ============================================================

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

// ============================================================
// CONFIG
// ============================================================
const PORT = process.env.PORT || 3002;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID || 'a98c57a2-20b8-49e4-a2e0-27d26ddccadd';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://juuisrycwhietlnizudj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dWlzcnljd2hpZXRsbml6dWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDMyMDksImV4cCI6MjA4Nzk3OTIwOX0.dhH1NhPupXvtXtl35cXWBHQGj-SPAehQ9kLuMd9jF34';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// REDIS + BULLMQ
// ============================================================
let redisConnection;
let topicQueue, briefQueue, postQueue, scheduleQueue, metricsQueue;

function initQueues() {
  try {
    redisConnection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
    const opts = { connection: redisConnection };

    topicQueue = new Queue('topic_queue', opts);
    briefQueue = new Queue('brief_queue', opts);
    postQueue = new Queue('post_queue', opts);
    scheduleQueue = new Queue('schedule_queue', opts);
    metricsQueue = new Queue('metrics_queue', opts);

    console.log('[RUNTIME] Queues initialized');
    return true;
  } catch (err) {
    console.error('[RUNTIME] Queue init failed:', err.message);
    return false;
  }
}

// ============================================================
// PROMPTS
// ============================================================
const PROMPTS = {
  topics: `You are a media strategist for The Schreck Method. Generate Founder Intelligence Brief topics. Return JSON with a top-level "topics" array. Each: title, angle, hook, targetPersona, sourceKind, sourceRef, theme. Voice: calm, direct, institutional. No generic motivation. No hustle culture.`,
  brief: `Create an Intelligence Brief. Return JSON with: title, thesis, hook, outline (array), cta, script. Tone: elite, strategic, calm, direct. Institutional authority. No fluff.`,
  posts: `Transform an Intelligence Brief into platform-native posts. Return JSON with keys: youtube, youtube_shorts, linkedin, x, instagram, facebook. Each value: {title, body}. Preserve brand tone. No hashtags on LinkedIn. No emoji.`
};

// ============================================================
// SCORING
// ============================================================
function scoreTopic(t) {
  let s = 50;
  const text = `${t.title} ${t.angle} ${t.hook} ${t.theme}`.toLowerCase();
  if (text.includes('founder')) s += 8;
  if (text.includes('burnout')) s += 8;
  if (text.includes('identity')) s += 7;
  if (text.includes('pressure')) s += 7;
  if (text.includes('governance')) s += 7;
  if (text.includes('decision')) s += 6;
  if (text.includes('resilience')) s += 6;
  if ((t.targetPersona || '').toLowerCase().includes('founder')) s += 6;
  return Math.min(s, 100);
}

// ============================================================
// AI HELPER
// ============================================================
async function askGPT(systemPrompt, userContent) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: typeof userContent === 'string' ? userContent : JSON.stringify(userContent) }
    ],
    temperature: 0.7
  });
  return JSON.parse(res.choices[0]?.message?.content || '{}');
}

// ============================================================
// MEDIA FUNCTIONS
// ============================================================
async function generateTopics(wsId, count = 20, sourceNotes) {
  const parsed = await askGPT(PROMPTS.topics, `Generate ${count} topics. Context: ${sourceNotes || 'Founder pressure, identity, resilience, governance, ICA, structural discipline.'}`);
  const rows = (parsed.topics || []).map(t => ({
    workspace_id: wsId, title: t.title, angle: t.angle, hook: t.hook,
    target_persona: t.targetPersona, source_kind: t.sourceKind || 'ai',
    source_ref: t.sourceRef || null, theme: t.theme || 'general',
    score: scoreTopic(t), status: 'idea'
  }));
  const { data, error } = await supabase.from('media_topics').insert(rows).select('*');
  if (error) throw error;
  return data;
}

async function createBrief(topic) {
  const parsed = await askGPT(PROMPTS.brief, topic);
  const { data, error } = await supabase.from('media_briefs').insert({
    workspace_id: topic.workspace_id, topic_id: topic.id, type: 'long_form_video',
    title: parsed.title, thesis: parsed.thesis, hook: parsed.hook,
    outline: parsed.outline || [], cta: parsed.cta, script: parsed.script || null, status: 'drafted'
  }).select('*').single();
  if (error) throw error;
  await supabase.from('media_topics').update({ status: 'drafted' }).eq('id', topic.id);
  return data;
}

async function createPosts(brief) {
  const parsed = await askGPT(PROMPTS.posts, brief);
  const platforms = ['youtube', 'youtube_shorts', 'linkedin', 'x', 'instagram', 'facebook'];
  const rows = platforms.filter(p => parsed[p]).map(p => ({
    workspace_id: brief.workspace_id, brief_id: brief.id, platform: p,
    title: parsed[p]?.title || null, body: parsed[p]?.body || '', status: 'drafted'
  }));
  const { data, error } = await supabase.from('media_posts').insert(rows).select('*');
  if (error) throw error;
  return data;
}

// ============================================================
// LOG / ALERT HELPERS
// ============================================================
async function logEvent(wsId, eventType, message, metadata = {}) {
  await supabase.from('runtime_logs').insert({ workspace_id: wsId, event_type: eventType, message, metadata }).catch(() => {});
}

async function createAlert(wsId, severity, category, message, metadata = {}) {
  await supabase.from('runtime_alerts').insert({ workspace_id: wsId, severity, category, message, metadata, is_resolved: false }).catch(() => {});
}

async function createJob(wsId, jobType, payload = {}) {
  const { data, error } = await supabase.from('runtime_jobs').insert({ workspace_id: wsId, job_type: jobType, status: 'queued', payload }).select('*').single();
  if (error) throw error;
  return data;
}

async function updateJob(jobId, status, result, errorMsg) {
  const update = { status, ended_at: ['succeeded', 'failed'].includes(status) ? new Date().toISOString() : null };
  if (result) update.result = result;
  if (errorMsg) update.error_message = errorMsg;
  await supabase.from('runtime_jobs').update(update).eq('id', jobId);
}

// ============================================================
// WORKERS
// ============================================================
function initWorkers() {
  const workerOpts = { connection: redisConnection };

  new Worker('topic_queue', async (job) => {
    const { runtimeJobId, workspaceId, count, sourceNotes } = job.data;
    await supabase.from('runtime_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runtimeJobId);
    try {
      const rows = await generateTopics(workspaceId, count, sourceNotes);
      await updateJob(runtimeJobId, 'succeeded', { created: rows.length });
      await logEvent(workspaceId, 'topics_generated', `Generated ${rows.length} topics`, { runtimeJobId });
    } catch (e) {
      await updateJob(runtimeJobId, 'failed', null, e.message);
    }
  }, workerOpts);

  new Worker('brief_queue', async (job) => {
    const { runtimeJobId, workspaceId, count } = job.data;
    await supabase.from('runtime_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runtimeJobId);
    try {
      const { data: topics } = await supabase.from('media_topics').select('*').eq('workspace_id', workspaceId).eq('status', 'idea').order('score', { ascending: false }).limit(count);
      for (const t of (topics || [])) { await createBrief(t); }
      await updateJob(runtimeJobId, 'succeeded', { created: (topics || []).length });
      await logEvent(workspaceId, 'briefs_generated', `Generated ${(topics || []).length} briefs`, { runtimeJobId });
    } catch (e) {
      await updateJob(runtimeJobId, 'failed', null, e.message);
    }
  }, workerOpts);

  new Worker('post_queue', async (job) => {
    const { runtimeJobId, workspaceId, count } = job.data;
    await supabase.from('runtime_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runtimeJobId);
    try {
      const { data: briefs } = await supabase.from('media_briefs').select('*').eq('workspace_id', workspaceId).eq('status', 'drafted').limit(count);
      let total = 0;
      for (const b of (briefs || [])) { const posts = await createPosts(b); total += posts.length; }
      await updateJob(runtimeJobId, 'succeeded', { created: total });
      await logEvent(workspaceId, 'posts_generated', `Generated ${total} posts`, { runtimeJobId });
    } catch (e) {
      await updateJob(runtimeJobId, 'failed', null, e.message);
    }
  }, workerOpts);

  new Worker('schedule_queue', async (job) => {
    const { runtimeJobId, workspaceId, horizonDays } = job.data;
    await supabase.from('runtime_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runtimeJobId);
    try {
      const { data: posts } = await supabase.from('media_posts').select('*').eq('workspace_id', workspaceId).eq('status', 'drafted').limit(horizonDays * 5);
      const start = new Date();
      for (let i = 0; i < (posts || []).length; i++) {
        const scheduled = new Date(start.getTime() + i * 4 * 60 * 60 * 1000).toISOString();
        await supabase.from('media_posts').update({ status: 'scheduled', scheduled_for: scheduled }).eq('id', posts[i].id);
        await supabase.from('media_publish_jobs').insert({ workspace_id: workspaceId, post_id: posts[i].id, platform: posts[i].platform, payload: posts[i], status: 'queued', scheduled_for: scheduled });
      }
      if ((posts || []).length < 5) await createAlert(workspaceId, 'warning', 'schedule', 'Low content volume', { count: (posts || []).length });
      await updateJob(runtimeJobId, 'succeeded', { scheduled: (posts || []).length });
      await logEvent(workspaceId, 'content_scheduled', `Scheduled ${(posts || []).length} posts`, { runtimeJobId });
    } catch (e) {
      await updateJob(runtimeJobId, 'failed', null, e.message);
    }
  }, workerOpts);

  new Worker('metrics_queue', async (job) => {
    const { runtimeJobId, workspaceId } = job.data;
    await supabase.from('runtime_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runtimeJobId);
    try {
      const { data: metrics } = await supabase.from('media_metrics').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(100);
      const revenue = (metrics || []).reduce((s, r) => s + Number(r.revenue || 0), 0);
      if (revenue > 1000) await createAlert(workspaceId, 'info', 'revenue', `Revenue exceeded $1K: $${revenue.toFixed(2)}`, { revenue });
      await updateJob(runtimeJobId, 'succeeded', { checked: (metrics || []).length, revenue });
      await logEvent(workspaceId, 'metrics_refreshed', `Revenue sample: $${revenue.toFixed(2)}`, { runtimeJobId });
    } catch (e) {
      await updateJob(runtimeJobId, 'failed', null, e.message);
    }
  }, workerOpts);

  console.log('[RUNTIME] Workers initialized — 5 queue processors active');
}

// ============================================================
// CRON SCHEDULER (simple setInterval)
// ============================================================
function initScheduler() {
  const isAutonomous = process.env.AUTONOMOUS_MODE !== 'false';
  if (!isAutonomous) {
    console.log('[RUNTIME] Autonomous mode DISABLED — no scheduled jobs');
    return;
  }

  // Check every minute, run at scheduled times (UTC)
  setInterval(async () => {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();

    try {
      // 06:00 UTC — Generate topics
      if (h === 6 && m === 0) {
        const job = await createJob(WORKSPACE_ID, 'generate_topics', { count: 20 });
        await topicQueue.add('generate_topics', { runtimeJobId: job.id, workspaceId: WORKSPACE_ID, count: 20 });
        console.log('[SCHEDULER] Queued: generate_topics');
      }
      // 06:15 UTC — Generate briefs
      if (h === 6 && m === 15) {
        const job = await createJob(WORKSPACE_ID, 'create_briefs', { count: 10 });
        await briefQueue.add('create_briefs', { runtimeJobId: job.id, workspaceId: WORKSPACE_ID, count: 10 });
        console.log('[SCHEDULER] Queued: create_briefs');
      }
      // 06:30 UTC — Generate posts
      if (h === 6 && m === 30) {
        const job = await createJob(WORKSPACE_ID, 'generate_posts', { count: 10 });
        await postQueue.add('generate_posts', { runtimeJobId: job.id, workspaceId: WORKSPACE_ID, count: 10 });
        console.log('[SCHEDULER] Queued: generate_posts');
      }
      // 06:45 UTC — Schedule content
      if (h === 6 && m === 45) {
        const job = await createJob(WORKSPACE_ID, 'schedule_content', { horizonDays: 7 });
        await scheduleQueue.add('schedule_content', { runtimeJobId: job.id, workspaceId: WORKSPACE_ID, horizonDays: 7 });
        console.log('[SCHEDULER] Queued: schedule_content');
      }
      // 20:00 UTC — Refresh metrics
      if (h === 20 && m === 0) {
        const job = await createJob(WORKSPACE_ID, 'refresh_metrics', {});
        await metricsQueue.add('refresh_metrics', { runtimeJobId: job.id, workspaceId: WORKSPACE_ID });
        console.log('[SCHEDULER] Queued: refresh_metrics');
      }
    } catch (err) {
      console.error('[SCHEDULER] Error:', err.message);
    }
  }, 60000);

  console.log('[RUNTIME] Scheduler active — autonomous pipeline runs daily at 06:00-06:45 UTC + 20:00 UTC');
}

// ============================================================
// SETTINGS
// ============================================================
async function getSettings(wsId) {
  const { data, error } = await supabase.from('runtime_settings').select('*').eq('workspace_id', wsId).single();
  if (data) return data;
  // Create defaults
  const { data: created } = await supabase.from('runtime_settings').insert({
    workspace_id: wsId, autonomous_mode: true, operator_mode: true, safe_mode: true,
    daily_topic_target: 20, daily_brief_target: 10, daily_post_target: 30, schedule_horizon_days: 7
  }).select('*').single();
  return created;
}

// ============================================================
// API ROUTES
// ============================================================

// Health
app.get('/api/runtime/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'command-center-runtime',
    version: '3.1',
    redis: !!redisConnection,
    supabase: true,
    workspace: WORKSPACE_ID,
    uptime: process.uptime()
  });
});

// Summary
app.get('/api/runtime/summary', async (req, res) => {
  try {
    const ws = req.query.workspaceId || WORKSPACE_ID;
    const [metricsRes, postsRes, topicsRes, jobsRes] = await Promise.all([
      supabase.from('media_metrics').select('revenue, purchases, clicks').eq('workspace_id', ws),
      supabase.from('media_posts').select('*', { count: 'exact', head: true }).eq('workspace_id', ws),
      supabase.from('media_topics').select('*', { count: 'exact', head: true }).eq('workspace_id', ws),
      supabase.from('runtime_jobs').select('status').eq('workspace_id', ws)
    ]);
    const metrics = metricsRes.data || [];
    const revenue = metrics.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const failed = (jobsRes.data || []).filter(j => j.status === 'failed').length;
    res.json({ revenue, posts: postsRes.count || 0, topics: topicsRes.count || 0, queueHealth: Math.max(0, 100 - failed * 15), automationRuns: (jobsRes.data || []).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Jobs
app.get('/api/runtime/jobs', async (req, res) => {
  const ws = req.query.workspaceId || WORKSPACE_ID;
  const { data } = await supabase.from('runtime_jobs').select('*').eq('workspace_id', ws).order('created_at', { ascending: false }).limit(20);
  res.json({ jobs: data || [] });
});

// Alerts
app.get('/api/runtime/alerts', async (req, res) => {
  const ws = req.query.workspaceId || WORKSPACE_ID;
  const { data } = await supabase.from('runtime_alerts').select('*').eq('workspace_id', ws).eq('is_resolved', false).order('created_at', { ascending: false }).limit(20);
  res.json({ alerts: data || [] });
});

// Settings
app.get('/api/runtime/settings', async (req, res) => {
  try {
    const ws = req.query.workspaceId || WORKSPACE_ID;
    res.json(await getSettings(ws));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/runtime/settings', async (req, res) => {
  try {
    const ws = req.query.workspaceId || WORKSPACE_ID;
    const { data, error } = await supabase.from('runtime_settings').update(req.body).eq('workspace_id', ws).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Logs
app.get('/api/runtime/logs', async (req, res) => {
  const ws = req.query.workspaceId || WORKSPACE_ID;
  const { data } = await supabase.from('runtime_logs').select('*').eq('workspace_id', ws).order('created_at', { ascending: false }).limit(50);
  res.json({ logs: data || [] });
});

// === ACTION ENDPOINTS (manual triggers) ===

app.post('/api/runtime/actions/generate-topics', async (req, res) => {
  try {
    const ws = req.body.workspaceId || WORKSPACE_ID;
    const count = req.body.count || 20;
    const job = await createJob(ws, 'generate_topics', { count, sourceNotes: req.body.sourceNotes });
    await topicQueue.add('generate_topics', { runtimeJobId: job.id, workspaceId: ws, count, sourceNotes: req.body.sourceNotes });
    res.json({ ok: true, job });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/runtime/actions/create-briefs', async (req, res) => {
  try {
    const ws = req.body.workspaceId || WORKSPACE_ID;
    const count = req.body.count || 10;
    const job = await createJob(ws, 'create_briefs', { count });
    await briefQueue.add('create_briefs', { runtimeJobId: job.id, workspaceId: ws, count });
    res.json({ ok: true, job });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/runtime/actions/generate-posts', async (req, res) => {
  try {
    const ws = req.body.workspaceId || WORKSPACE_ID;
    const count = req.body.count || 10;
    const job = await createJob(ws, 'generate_posts', { count });
    await postQueue.add('generate_posts', { runtimeJobId: job.id, workspaceId: ws, count });
    res.json({ ok: true, job });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/runtime/actions/schedule-content', async (req, res) => {
  try {
    const ws = req.body.workspaceId || WORKSPACE_ID;
    const horizonDays = req.body.horizonDays || 7;
    const job = await createJob(ws, 'schedule_content', { horizonDays });
    await scheduleQueue.add('schedule_content', { runtimeJobId: job.id, workspaceId: ws, horizonDays });
    res.json({ ok: true, job });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/runtime/actions/refresh-metrics', async (req, res) => {
  try {
    const ws = req.body.workspaceId || WORKSPACE_ID;
    const job = await createJob(ws, 'refresh_metrics', {});
    await metricsQueue.add('refresh_metrics', { runtimeJobId: job.id, workspaceId: ws });
    res.json({ ok: true, job });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Full pipeline — one click
app.post('/api/runtime/actions/full-pipeline', async (req, res) => {
  try {
    const ws = req.body.workspaceId || WORKSPACE_ID;
    const j1 = await createJob(ws, 'generate_topics', { count: 5 });
    await topicQueue.add('generate_topics', { runtimeJobId: j1.id, workspaceId: ws, count: 5 });
    // Chain: after topics, queue briefs and posts with delay
    const j2 = await createJob(ws, 'create_briefs', { count: 5 });
    await briefQueue.add('create_briefs', { runtimeJobId: j2.id, workspaceId: ws, count: 5 }, { delay: 30000 });
    const j3 = await createJob(ws, 'generate_posts', { count: 5 });
    await postQueue.add('generate_posts', { runtimeJobId: j3.id, workspaceId: ws, count: 5 }, { delay: 60000 });
    res.json({ ok: true, pipeline: { topics: j1.id, briefs: j2.id, posts: j3.id } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// STARTUP
// ============================================================
async function start() {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   COMMAND CENTER RUNTIME v3.1                ║
  ║   Strength. Systems. Permanence.             ║
  ╚══════════════════════════════════════════════╝
  `);

  const queuesOk = initQueues();
  if (queuesOk) {
    initWorkers();
    initScheduler();
  } else {
    console.warn('[RUNTIME] Running in API-only mode (no Redis)');
  }

  app.listen(PORT, () => {
    console.log(`[RUNTIME] Listening on port ${PORT}`);
    console.log(`[RUNTIME] Supabase: ${SUPABASE_URL}`);
    console.log(`[RUNTIME] Workspace: ${WORKSPACE_ID}`);
    console.log(`[RUNTIME] Redis: ${REDIS_URL}`);
  });
}

start().catch(err => {
  console.error('[RUNTIME] Fatal:', err.message);
  process.exit(1);
});
