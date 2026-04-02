import { defineConfig } from 'prisma/config';
import { serverEnv } from './lib/server-env';
import 'dotenv/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: serverEnv.DATABASE_URL,
  },
});
