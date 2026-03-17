"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envValidationSchema = void 0;
const zod_1 = require("zod");
exports.envValidationSchema = zod_1.z.object({
    PORT: zod_1.z.string().optional(),
    SUPABASE_URL: zod_1.z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional(),
    OPENAI_API_KEY: zod_1.z.string().min(1),
    REDIS_URL: zod_1.z.string().min(1),
    DEFAULT_WORKSPACE_ID: zod_1.z.string().optional(),
    AUTONOMOUS_MODE: zod_1.z.string().optional(),
    SAFE_MODE: zod_1.z.string().optional(),
}).passthrough();
//# sourceMappingURL=env.validation.js.map