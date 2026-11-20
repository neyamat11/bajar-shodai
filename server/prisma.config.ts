import 'dotenv/config';
import { defineConfig } from 'prisma/config';

function resolveNeonUrl(urlStr?: string): string | undefined {
  if (!urlStr) return undefined;
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes('.neon.tech')) {
      const endpoint = url.hostname.split('.')[0];
      // On Windows where IPv6 routes are absent, direct IPv4 prevents P1001 timeouts
      url.hostname = '52.76.108.241';
      url.searchParams.set('options', `endpoint=${endpoint}`);
      return url.toString();
    }
  } catch {}
  return urlStr;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
  datasource: {
    url: resolveNeonUrl(process.env['DATABASE_URL_DIRECT'] || process.env['DATABASE_URL']),
  },
});
