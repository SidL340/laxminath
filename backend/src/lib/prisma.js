const { PrismaClient } = require('@prisma/client');

// FIX I-03: Proper singleton pattern for Express (not Next.js hot-reload pattern)
// In a pure Express app, the module cache handles singleton behavior.
// We don't use global.prisma caching since that pattern is for Next.js dev mode only.
let prismaInstance = null;

function getPrismaClient() {
  if (prismaInstance) return prismaInstance;

  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Removed 'query' log in development to avoid leaking data in logs
  });

  return prismaInstance;
}

const prisma = getPrismaClient();

module.exports = prisma;
