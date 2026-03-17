import { z } from 'zod';
export declare const envValidationSchema: z.ZodObject<{
    PORT: z.ZodOptional<z.ZodString>;
    SUPABASE_URL: z.ZodOptional<z.ZodString>;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodOptional<z.ZodString>;
    OPENAI_API_KEY: z.ZodString;
    REDIS_URL: z.ZodString;
    DEFAULT_WORKSPACE_ID: z.ZodOptional<z.ZodString>;
    AUTONOMOUS_MODE: z.ZodOptional<z.ZodString>;
    SAFE_MODE: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    PORT: z.ZodOptional<z.ZodString>;
    SUPABASE_URL: z.ZodOptional<z.ZodString>;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodOptional<z.ZodString>;
    OPENAI_API_KEY: z.ZodString;
    REDIS_URL: z.ZodString;
    DEFAULT_WORKSPACE_ID: z.ZodOptional<z.ZodString>;
    AUTONOMOUS_MODE: z.ZodOptional<z.ZodString>;
    SAFE_MODE: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    PORT: z.ZodOptional<z.ZodString>;
    SUPABASE_URL: z.ZodOptional<z.ZodString>;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodOptional<z.ZodString>;
    OPENAI_API_KEY: z.ZodString;
    REDIS_URL: z.ZodString;
    DEFAULT_WORKSPACE_ID: z.ZodOptional<z.ZodString>;
    AUTONOMOUS_MODE: z.ZodOptional<z.ZodString>;
    SAFE_MODE: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
