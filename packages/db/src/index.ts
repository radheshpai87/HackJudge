import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Vercel fix: auto-detect Prisma engine binary location at runtime
function findEngineBinary(): string | undefined {
  const candidates = [
    // Copy-script locations
    process.cwd() + '/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
    process.cwd() + '/.next/server/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
    process.cwd() + '/prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
    // Vercel runtime paths (monorepo)
    '/var/task/apps/web/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
    '/var/task/apps/web/.next/server/libquery_engine-rhel-openssl-3.0.x.so.node',
    '/var/task/apps/web/prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
    '/var/task/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
    '/tmp/prisma-engines/libquery_engine-rhel-openssl-3.0.x.so.node',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // Also try debian variant
  const debianCandidates = candidates.map(p => p.replace('rhel-openssl-3.0.x', 'debian-openssl-3.0.x'));
  for (const p of debianCandidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const enginePath = findEngineBinary();
if (enginePath) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
}

export const prisma = new PrismaClient();
export * from "@prisma/client";
