import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  // If running in an environment without a valid postgres connection string yet,
  // return standard client (which will be safely caught by fallback store)
  if (!connectionString || connectionString.includes("ep-sample")) {
    return new PrismaClient();
  }

  try {
    // Config for serverless WebSocket connection via PrismaNeon
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter });
  } catch (error) {
    console.warn("Failed to initialize PrismaNeon adapter, falling back to standard PrismaClient:", error);
    return new PrismaClient();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
