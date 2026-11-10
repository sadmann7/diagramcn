import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // Optional so the inspector and stacks work without a database.
    // Change tracking is disabled when it's unset.
    DATABASE_URL: z.url().optional(),
    // Vercel sends it as a bearer token on cron requests.
    CRON_SECRET: z.string().min(16).optional(),
  },
  client: {},
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    CRON_SECRET: process.env.CRON_SECRET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
