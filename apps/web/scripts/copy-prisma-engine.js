const fs = require('fs');
const path = require('path');

// Find the Prisma engine binary in monorepo root
const possiblePaths = [
  path.join(__dirname, '../../../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client'),
  path.join(__dirname, '../../../node_modules/.prisma/client'),
];

let prismaClientDir = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    prismaClientDir = p;
    break;
  }
}

if (!prismaClientDir) {
  console.error('Could not find Prisma client directory');
  process.exit(1);
}

const files = fs.readdirSync(prismaClientDir);
const nodeFiles = files.filter(f => f.endsWith('.node'));

if (nodeFiles.length === 0) {
  console.error('No Prisma engine binaries found');
  process.exit(1);
}

const webRoot = path.join(__dirname, '..');

// Copy to ALL locations Prisma searches on Vercel
const outputDirs = [
  // Next.js server output (Prisma searches .next/server directly)
  path.join(webRoot, '.next/server'),
  // Hidden .prisma dir in app root (searched as /var/task/apps/web/.prisma/client)
  path.join(webRoot, '.prisma/client'),
  // Also in node_modules/.prisma/client for module resolution
  path.join(webRoot, 'node_modules/.prisma/client'),
  // Parent of node_modules (some Prisma versions search here)
  path.join(webRoot, 'node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client'),
];

for (const dir of outputDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  for (const file of nodeFiles) {
    const src = path.join(prismaClientDir, file);
    const dest = path.join(dir, file);
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to ${dir}`);
  }
}

// Also write a helper file that sets the env var path for runtime
const rhelBinary = nodeFiles.find(f => f.includes('rhel-openssl-3.0'));
if (rhelBinary) {
  const envPath = path.join(webRoot, '.next/server/.prisma-engine-path.js');
  fs.writeFileSync(envPath, `
// Auto-generated: Prisma engine path for Vercel
process.env.PRISMA_QUERY_ENGINE_LIBRARY = '${path.join(webRoot, '.prisma/client', rhelBinary).replace(/\\/g, '\\\\')}';
`);
  console.log('Wrote PRISMA_QUERY_ENGINE_LIBRARY path helper');
}

console.log('Prisma engine binaries copied successfully');
