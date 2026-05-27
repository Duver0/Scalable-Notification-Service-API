// Compatibility wrapper for Prisma 7.x generated client
// The generated client uses ESM (import.meta) which Jest (CJS) cannot parse directly.
// This wrapper imports it dynamically for runtime, and provides a static mock for testing.

let PrismaClientCached: any = null;

async function getPrismaClientClass() {
  if (!PrismaClientCached) {
    // Dynamic import works in both CJS and ESM contexts
    const mod = await import("../../../../generated/prisma/client");
    PrismaClientCached = mod.PrismaClient;
  }
  return PrismaClientCached as new (...args: unknown[]) => unknown;
}

export { getPrismaClientClass };
