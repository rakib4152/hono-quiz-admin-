import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../../packages/database/src/schema';

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

  // 1. Insert Categories
  await db.insert(schema.categories).values([
    { name: 'English Literature', slug: 'english-literature' },
    { name: 'General Knowledge', slug: 'general-knowledge' },
  ]);

  // 2. Insert Exams
  await db.insert(schema.exams).values([
    { title: 'Honours Final Exam', description: 'Final year examination prep' },
    { title: 'Model Test 1', description: 'Practice test for beginners' },
  ]);

  // 3. Insert Quizzes
  await db.insert(schema.quizzes).values([
    { title: 'Shakespearean Drama Quiz', examId: 1, categoryId: 1, status: 'published' },
    { title: 'World History Quiz', examId: 2, categoryId: 2, status: 'published' },
  ]);

  console.log('Database seeded successfully with manual data!');
  await connection.end();
}

main();