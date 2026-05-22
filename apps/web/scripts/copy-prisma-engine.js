const fs = require('fs');
const path = require('path');

// Find the Prisma engine binary
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

// Find all .node files (binaries)
const files = fs.readdirSync(prismaClientDir);
const nodeFiles = files.filter(f => f.endsWith('.node'));

if (nodeFiles.length === 0) {
  console.error('No Prisma engine binaries found');
  process.exit(1);
}

// Copy to multiple locations that Prisma searches
const outputDirs = [
  path.join(__dirname, '../.next/server'),
  path.join(__dirname, '../.next/server/.prisma/client'),
  path.join(__dirname, '../prisma/client'),
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

console.log('Prisma engine binaries copied successfully');
