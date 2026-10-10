const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://nepal_mavi_db_user:kaRpJ9iUEbtw6n5kTvCaACfhIDzMo4FD@dpg-dab91h2d0e5s73do56s0-a.singapore-postgres.render.com/nepal_mavi_db?sslmode=require';

async function runMigration() {
  if (!connectionString) {
    console.warn('safe_bank_migration: No DATABASE_URL provided, skipping migration.');
    return;
  }
  let client;
  try {
    client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log('safe_bank_migration: Connected to PostgreSQL database.');

    // 1. Safely add bank columns to "Teacher" table if they don't exist
    await client.query(`ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "bankName" TEXT;`);
    await client.query(`ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "bankAccountNo" TEXT;`);
    await client.query(`ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "bankBranch" TEXT;`);

    // 2. Safely create "BankDirectory" table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "BankDirectory" (
        "id" SERIAL PRIMARY KEY,
        "bankName" TEXT NOT NULL,
        "branch" TEXT,
        "code" TEXT,
        "isDefault" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Safely create "TeacherBankAccount" table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TeacherBankAccount" (
        "id" SERIAL PRIMARY KEY,
        "teacherId" INTEGER NOT NULL,
        "bankName" TEXT NOT NULL,
        "accountNumber" TEXT NOT NULL,
        "branch" TEXT,
        "accountType" TEXT DEFAULT 'SALARY',
        "isPrimary" BOOLEAN DEFAULT false,
        "remarks" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TeacherBankAccount_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('safe_bank_migration: Database tables and columns verified successfully.');
  } catch (err) {
    console.warn('safe_bank_migration warning (non-fatal):', err.message);
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (e) {}
    }
  }
}

// Auto-run when required or executed directly
runMigration();

module.exports = runMigration;
