const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Generating Prisma Client...');
try {
  const localPrisma = path.resolve(__dirname, '../node_modules/.bin/prisma');
  if (fs.existsSync(localPrisma)) {
    execSync(`"${localPrisma}" generate`, { stdio: 'inherit', env: process.env });
  } else {
    execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
  }
  console.log('Prisma Client generated successfully.');
} catch (err) {
  console.warn('Prisma generate warning (trying fallback):', err.message);
  try {
    execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
  } catch (e2) {
    console.error('Final Prisma generate error:', e2.message);
    process.exit(1);
  }
}
