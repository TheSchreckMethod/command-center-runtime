export const RUNTIME_QUEUES = {
  TOPIC: 'topic_queue',
  BRIEF: 'brief_queue',
  POST: 'post_queue',
  SCHEDULE: 'schedule_queue',
  METRICS: 'metrics_queue',
} as const;

export const RUNTIME_JOBS = {
  GENERATE_TOPICS: 'generate_topics',
  CREATE_BRIEFS: 'create_briefs',
  GENERATE_POSTS: 'generate_posts',
  SCHEDULE_CONTENT: 'schedule_content',
  REFRESH_METRICS: 'refresh_metrics',
} as const;
