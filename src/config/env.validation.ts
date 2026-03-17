import { z } from 'zod';

export const envValidationSchema = z.object({
  PORT: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1),
  REDIS_URL: z.string().min(1),
  DEFAULT_WORKSPACE_ID: z.string().optional(),
  AUTONOMOUS_MODE: z.string().optional(),
  SAFE_MODE: z.string().optional(),
}).passthrough();
