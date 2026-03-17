import { z } from 'zod';

export const envValidationSchema = z.object({
  PORT: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1),
  REDIS_URL: z.string().min(1),
  DEFAULT_WORKSPACE_ID: z.string().uuid().optional(),
  AUTONOMOUS_MODE: z.string().optional(),
  SAFE_MODE: z.string().optional(),
});
