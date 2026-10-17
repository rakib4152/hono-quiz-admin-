import mysql from 'mysql2/promise';

async function truncateTables() {
  const connection = await mysql.createConnection({
    host: 'srv1562.hstgr.io',
    port: 3306,
    user: 'u427015050_drizzlequiz',
    password: 'R.r.4152',
    database: 'u427015050_drizzle',
  });

  await connection.query('TRUNCATE TABLE categories');
  await connection.query('TRUNCATE TABLE exams');
  await connection.query('TRUNCATE TABLE quizzes');
  await connection.query('TRUNCATE TABLE questions');
  await connection.query('TRUNCATE TABLE options');
  await connection.query('TRUNCATE TABLE quiz_questions');

  await connection.end();
  console.log('Tables truncated successfully');
}

truncateTables().catch(console.error);