import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './packages/database/src/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: 'srv1562.hstgr.io',
    port: 3306,
    user: 'u427015050_drizzlequiz',
    password: 'R.r.4152',
    database: 'u427015050_drizzle',
  },
});