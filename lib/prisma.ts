import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    // During build time, DATABASE_URL might not be available
    // Use a valid placeholder URL format that Prisma will accept
    // Prisma won't actually connect during build - it's just for initialization
    return new PrismaClient({
      log: [],
      datasources: {
        db: {
          url: "postgresql://user:password@localhost:5432/dbname?schema=public",
        },
      },
    });
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

// Lazy initialization - only create client when actually accessed
function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  
  const client = createPrismaClient();
  
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  
  return client;
}

// Export as a getter to ensure lazy initialization
// This prevents Prisma Client from being instantiated during module import
let prismaInstance: PrismaClient | null = null;

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!prismaInstance) {
      prismaInstance = getPrismaClient();
    }
    const value = (prismaInstance as any)[prop];
    if (typeof value === "function") {
      return value.bind(prismaInstance);
    }
    return value;
  },
});
