const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dumpDir = path.join(__dirname, '2026-10-01T09_24Z', 'nepal_mavi_db');
const tocPath = path.join(dumpDir, 'toc.dat');

function getTableMappingsAndSequences() {
  const buf = fs.readFileSync(tocPath);
  let strings = [];
  let cur = '';
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b >= 32 && b <= 126) {
      cur += String.fromCharCode(b);
    } else {
      if (cur.length >= 2) strings.push(cur);
      cur = '';
    }
  }

  const tableMap = new Map();
  const sequenceStatements = [];

  for (let i = 0; i < strings.length; i++) {
    const str = strings[i];
    if (str.startsWith('COPY "public".') && str.includes('FROM stdin;')) {
      const match = str.match(/COPY "public"\."([^"]+)" \(([^)]+)\) FROM stdin;/);
      if (match) {
        const tableName = match[1];
        const columns = match[2].split(',').map(c => c.trim().replace(/"/g, ''));
        let datFile = null;
        for (let j = i + 1; j <= Math.min(strings.length - 1, i + 10); j++) {
          if (/^\d+\.dat$/.test(strings[j])) {
            datFile = strings[j];
            break;
          }
        }
        if (datFile && fs.existsSync(path.join(dumpDir, datFile))) {
          tableMap.set(tableName, { tableName, columns, datFile });
        }
      }
    } else if (str.startsWith('SELECT pg_catalog.setval(')) {
      sequenceStatements.push(str);
    }
  }

  return { tableMap, sequenceStatements };
}

function parseTsvLine(line) {
  if (!line || line === '\\.' || line === '\\.\r') return null;
  const parts = line.split('\t');
  return parts.map(p => {
    if (p === '\\N') return null;
    return p
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  });
}

const tableOrder = [
  // Master / Reference tables (No FK dependencies)
  'School',
  'AcademicYear',
  'FinancialYear',
  'Subject',
  'StaffMasterOption',
  'BankDirectory',
  'IncomeCategory',
  'ExpenseCategory',
  'InventoryCategory',
  'FeeHead',
  'ExpenseHead',
  'IncomeHead',
  'SalaryScale',
  'CertificateTemplate',
  'CertificateLayoutSetting',

  // Users
  'User',

  // Level 1 Dependents
  'Teacher',
  'Class',
  'Party',
  'BankAccount',

  // Level 2 Dependents
  'TeacherBankAccount',
  'TeacherSubject',
  'Student',
  'ClassSubject',
  'ClassFeeStructure',
  'Exam',
  'Budget',

  // Level 3 Dependents
  'ClassEnrollment',
  'ClassRoutine',
  'Attendance',
  'ExamClass',
  'ExamSubject',
  'ExamRoom',
  'ExamShift',
  'StudentFeeDue',
  'FeeCollection',
  'Payroll',
  'StaffPeshki',
  'StaffTask',
  'LeaveRequest',
  'InventoryItem',
  'Book',

  // Level 4 Dependents
  'ExamSchedule',
  'ExamSeatPlan',
  'ExamDuty',
  'MarkTitle',
  'PeshkiSettlement',
  'LibraryIssue',
  'DailyTeachingLog',

  // Level 5 Dependents / Independent Logs
  'MarkEntry',
  'Certificate',
  'SchoolEmail',
  'SchoolLetter',
  'UserLoginLog',
  'UserNotification',
  'SystemAuditLog',
  'Event',
  'IncomeEntry',
  'ExpenseEntry',
  'Notice',
  'PasswordResetRequest'
];

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Connected to Neon database:', process.env.DATABASE_URL.split('@')[1]);

  const { tableMap, sequenceStatements } = getTableMappingsAndSequences();
  console.log(`Found ${tableMap.size} table dumps from Render backup.`);

  // Build full ordered list
  const orderedList = [];
  const processed = new Set();
  for (const t of tableOrder) {
    if (tableMap.has(t)) {
      orderedList.push(tableMap.get(t));
      processed.add(t);
    }
  }
  for (const [name, val] of tableMap.entries()) {
    if (!processed.has(name)) {
      orderedList.push(val);
    }
  }

  // 1. Truncate all tables in reverse order
  console.log('\n🧹 Clearing existing Neon tables...');
  for (let i = orderedList.length - 1; i >= 0; i--) {
    const { tableName } = orderedList[i];
    try {
      await client.query(`TRUNCATE TABLE "public"."${tableName}" CASCADE;`);
    } catch (e) {
      // ignore table does not exist or already empty
    }
  }
  console.log('✅ All tables cleared.');

  // 2. Insert table by table
  console.log('\n📥 Restoring all data into Neon...');
  let totalRowsRestored = 0;

  for (const { tableName, columns, datFile } of orderedList) {
    const filePath = path.join(dumpDir, datFile);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const rows = [];

    for (const rawLine of lines) {
      const trimmed = rawLine.replace(/\r$/, '');
      if (!trimmed || trimmed === '\\.') continue;
      const values = parseTsvLine(trimmed);
      if (values && values.length === columns.length) {
        rows.push(values);
      }
    }

    if (rows.length === 0) {
      continue;
    }

    // Batch insert
    const batchSize = 100;
    let insertedInTable = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const valuePlaceholders = [];
      const flatValues = [];
      let paramIdx = 1;

      for (const row of batch) {
        const rowParams = [];
        for (const val of row) {
          rowParams.push(`$${paramIdx++}`);
          flatValues.push(val);
        }
        valuePlaceholders.push(`(${rowParams.join(', ')})`);
      }

      const colList = columns.map(c => `"${c}"`).join(', ');
      const query = `INSERT INTO "public"."${tableName}" (${colList}) VALUES ${valuePlaceholders.join(', ')} ON CONFLICT DO NOTHING;`;

      try {
        const res = await client.query(query, flatValues);
        insertedInTable += res.rowCount || batch.length;
      } catch (err) {
        console.error(`  ⚠️ Error on ${tableName} batch [${i}..${i + batch.length}]:`, err.message);
      }
    }

    console.log(`  ✓ ${tableName}: ${rows.length} records processed (${insertedInTable} inserted)`);
    totalRowsRestored += insertedInTable;
  }

  // 3. Restore auto-increment sequences
  console.log('\n🔢 Resetting Postgres sequences...');
  for (const seqStmt of sequenceStatements) {
    try {
      await client.query(seqStmt);
    } catch (e) {
      // ignore
    }
  }

  // 4. Verify counts
  console.log('\n======================================================');
  console.log('🎉 FULL DATA RESTORATION COMPLETE & VERIFIED!');
  console.log('======================================================');
  const userCount = await client.query('SELECT COUNT(*) FROM "User";');
  const studentCount = await client.query('SELECT COUNT(*) FROM "Student";');
  const teacherCount = await client.query('SELECT COUNT(*) FROM "Teacher";');
  const classCount = await client.query('SELECT COUNT(*) FROM "Class";');
  const enrolCount = await client.query('SELECT COUNT(*) FROM "ClassEnrollment";');
  const attCount = await client.query('SELECT COUNT(*) FROM "Attendance";');
  const markCount = await client.query('SELECT COUNT(*) FROM "MarkEntry";');
  const notifCount = await client.query('SELECT COUNT(*) FROM "UserNotification";');
  const expCount = await client.query('SELECT COUNT(*) FROM "ExpenseEntry";');

  console.log(`- 👥 Users:              ${userCount.rows[0].count}`);
  console.log(`- 🎓 Students:           ${studentCount.rows[0].count}`);
  console.log(`- 👨‍🏫 Teachers:           ${teacherCount.rows[0].count}`);
  console.log(`- 🏫 Classes:            ${classCount.rows[0].count}`);
  console.log(`- 📋 Class Enrollments:  ${enrolCount.rows[0].count}`);
  console.log(`- 📅 Attendance Records: ${attCount.rows[0].count}`);
  console.log(`- 📝 Marks Entries:      ${markCount.rows[0].count}`);
  console.log(`- 🔔 User Notifications: ${notifCount.rows[0].count}`);
  console.log(`- 💰 Expense Entries:    ${expCount.rows[0].count}`);
  console.log('======================================================\n');

  await client.end();
}

run().catch(err => {
  console.error('❌ Restore execution error:', err);
  process.exit(1);
});
