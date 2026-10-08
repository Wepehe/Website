import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { config } from './config.js';
import { createContactStore } from './contact-store.js';
import { createRateLimiter } from './rate-limiter.js';
import { validateContact } from './validation.js';

const store = createContactStore(config.dataFile);
const checkRateLimit = createRateLimiter(config.rateLimit);

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function corsHeaders(origin) {
  if (!origin || !config.allowedOrigins.has(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function getClientAddress(request) {
  const forwarded = request.headers['x-forwarded-for'];
  return (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : request.socket.remoteAddress) || 'unknown';
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > config.bodyLimitBytes) {
      const error = new Error('Request body is too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.status = 400;
    throw error;
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost');

  if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (requestUrl.pathname !== '/api/contact') {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  const origin = request.headers.origin;
  const cors = corsHeaders(origin);
  if (origin && !cors) {
    sendJson(response, 403, { error: 'Origin not allowed.' });
    return;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, cors || {}).end();
    return;
  }
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed.' }, { Allow: 'POST, OPTIONS', ...cors });
    return;
  }
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    sendJson(response, 415, { error: 'Content-Type must be application/json.' }, cors);
    return;
  }

  const rate = checkRateLimit(getClientAddress(request));
  if (!rate.allowed) {
    sendJson(response, 429, { error: 'Too many messages. Please try again later.' }, {
      ...cors,
      'Retry-After': String(rate.retryAfterSeconds),
    });
    return;
  }

  try {
    const input = await readJson(request);
    const { contact, errors, valid } = validateContact(input);

    // A filled hidden field is probably a bot. Accept silently without storing it.
    if (contact.website) {
      sendJson(response, 202, { ok: true }, cors);
      return;
    }
    if (!valid) {
      sendJson(response, 422, { error: 'Check the highlighted information.', fields: errors }, cors);
      return;
    }

    await store.save({
      id: randomUUID(),
      receivedAt: new Date().toISOString(),
      name: contact.name,
      email: contact.email,
      message: contact.message,
    });
    sendJson(response, 201, { ok: true }, cors);
  } catch (error) {
    if (!error.status || error.status >= 500) console.error(error);
    sendJson(response, error.status || 500, {
      error: error.status ? error.message : 'The message could not be saved.',
    }, cors);
  }
});

server.listen(config.port, config.host, () => {
  console.log(`Contact API: http://${config.host}:${config.port}`);
  console.log(`Allowed origins: ${[...config.allowedOrigins].join(', ')}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
