import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 6: نشانی پایگاه داده در schema.prisma از DATABASE_URL خوانده می‌شود.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
