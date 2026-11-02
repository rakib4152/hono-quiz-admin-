import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../../packages/database/src/schema';
import { randomUUID } from 'crypto';

async function main() {
  const connection = await mysql.createConnection({
    host: 'srv1562.hstgr.io',
    port: 3306,
    user: 'u427015050_drizzlequiz',
    password: 'R.r.4152',
    database: 'u427015050_drizzle',
  });

  const db = drizzle(connection, { schema, mode: 'default' });

  console.log('Inserting sample categories, exams, and quizzes into Hostinger MySQL...');

  // Generate IDs
  const cat1Id = randomUUID();
  const cat2Id = randomUUID();
  const exam1Id = randomUUID();
  const exam2Id = randomUUID();
  const quiz1Id = randomUUID();
  const quiz2Id = randomUUID();

  // 1. Insert Categories
  await db.insert(schema.categories).values([
    { id: cat1Id, name: 'English Literature', slug: `english-literature-${Date.now()}` },
    { id: cat2Id, name: 'General Knowledge', slug: `general-knowledge-${Date.now()}` },
  ]);

  // 2. Insert Exams
  await db.insert(schema.exams).values([
    { id: exam1Id, name: 'Honours Final Exam', slug: `honours-final-${Date.now()}`, description: 'Final year examination prep', categoryId: cat1Id },
    { id: exam2Id, name: 'Model Test 1', slug: `model-test-1-${Date.now()}`, description: 'Practice test for beginners', categoryId: cat2Id },
  ]);

  // 3. Insert Quizzes
  await db.insert(schema.quizzes).values([
    { id: quiz1Id, title: 'Shakespearean Drama Quiz', slug: `shakespeare-quiz-${Date.now()}`, examId: exam1Id, status: 'PUBLISHED' },
    { id: quiz2Id, title: 'World History Quiz', slug: `world-history-quiz-${Date.now()}`, examId: exam2Id, status: 'PUBLISHED' },
  ]);

  console.log('Database seeded successfully with manual data!');
  await connection.end();
}

main();