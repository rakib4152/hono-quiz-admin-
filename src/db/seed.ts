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

  // Add mode: 'default' alongside your schema
  const db = drizzle(connection, { schema, mode: 'default' });

  console.log('Inserting sample categories, exams, and quizzes...');

  // Generate IDs
  const cat1Id = randomUUID();
  const cat2Id = randomUUID();
  const exam1Id = randomUUID();
  const exam2Id = randomUUID();
  const quiz1Id = randomUUID();
  const quiz2Id = randomUUID();

  // 1. Insert Categories
  await db.insert(schema.categories).values([
    { id: cat1Id, name: 'English Literature', slug: 'english-literature' },
    { id: cat2Id, name: 'General Knowledge', slug: 'general-knowledge' },
  ]);

  // 2. Insert Exams
  await db.insert(schema.exams).values([
    { id: exam1Id, title: 'Honours Final Exam', description: 'Final year examination prep', categoryId: cat1Id },
    { id: exam2Id, title: 'Model Test 1', description: 'Practice test for beginners', categoryId: cat2Id },
  ]);

  // 3. Insert Quizzes
  await db.insert(schema.quizzes).values([
    { id: quiz1Id, title: 'Shakespearean Drama Quiz', examId: exam1Id, categoryId: cat1Id, status: 'published' },
    { id: quiz2Id, title: 'World History Quiz', examId: exam2Id, categoryId: cat2Id, status: 'published' },
  ]);

  console.log('Database seeded successfully with manual data!');
  await connection.end();
}

main();