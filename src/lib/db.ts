import { PrismaClient } from "@prisma/client";

// یک نمونه‌ی مشترک؛ در حالت توسعه با Hot Reload چند اتصال ساخته نمی‌شود.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
