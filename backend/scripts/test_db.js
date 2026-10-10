const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  try {
    console.log('Connecting to PostgreSQL database at:', process.env.DATABASE_URL.split('@')[1]);
    await prisma.$connect();
    console.log('✅ Connected successfully to DB!');

    const userCount = await prisma.user.count();
    console.log('Total Users count:', userCount);

    const users = await prisma.user.findMany({
      take: 10,
      select: { id: true, username: true, role: true, isActive: true, passwordHash: true },
    });
    console.log('Sample Users:', users.map(u => ({ id: u.id, username: u.username, role: u.role, hashPrefix: u.passwordHash?.slice(0, 10) })));

    const studentMatch = await prisma.student.findFirst({
      where: {
        OR: [
          { studentId: '3201600017900644' },
          { emisId: '3201600017900644' },
        ],
      },
      include: { user: true },
    });
    console.log('Lookup Student 3201600017900644:', studentMatch ? {
      id: studentMatch.id,
      fullName: studentMatch.fullName,
      studentId: studentMatch.studentId,
      emisId: studentMatch.emisId,
      userId: studentMatch.userId,
      user: studentMatch.user ? { id: studentMatch.user.id, username: studentMatch.user.username, role: studentMatch.user.role } : null,
    } : 'NOT FOUND');

  } catch (err) {
    console.error('❌ Database error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
