import path from 'node:path';

function csv(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 8787),
  dataFile: path.resolve(process.env.DATA_FILE || 'server/data/contact-submissions.ndjson'),
  allowedOrigins: new Set(csv(process.env.ALLOWED_ORIGINS || [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://wepehe.github.io',
  ].join(','))),
  bodyLimitBytes: 16 * 1024,
  rateLimit: {
    maximumRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
};
