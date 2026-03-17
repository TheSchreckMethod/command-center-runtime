import { z } from 'zod';

export const envValidationSchema = z.object({
  PORT: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  REDIS_URL: z.string().min(1),
  DEFAULT_WORKSPACE_ID: z.string().uuid(),
  AUTONOMOUS_MODE: z.string().optional(),
  SAFE_MODE: z.string().optional(),
});
