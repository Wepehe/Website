import { createReadStream, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve(process.env.SITE_ROOT ?? '.');
const host = process.env.DEV_HOST ?? '127.0.0.1';
const port = Number(process.env.DEV_PORT ?? 8080);
const reloadClients = new Set();
const modificationTimes = new Map();

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
};

const reloadScript = `
<script>
  const reloadEvents = new EventSource('/__reload');
  reloadEvents.onmessage = () => window.location.reload();
</script>`;

function sendReload() {
  reloadClients.forEach((response) => response.write('data: reload\n\n'));
}

function frontendFiles() {
  const files = ['index.html'];
  const walk = (directory) => {
    let entries = [];
    try {
      entries = readdirSync(path.join(root, directory), { withFileTypes: true });
    } catch {
      return;
    }
    entries.forEach((entry) => {
      const relativePath = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) walk(relativePath);
      else files.push(relativePath);
    });
  };
  walk('assets');
  return files;
}

function getModificationTime(file) {
  try {
    return statSync(path.join(root, file)).mtimeMs;
  } catch {
    return 0;
  }
}

frontendFiles().forEach((file) => modificationTimes.set(file, getModificationTime(file)));

const watcher = setInterval(() => {
  let changed = false;

  const files = frontendFiles();
  const currentSet = new Set(files);
  files.forEach((file) => {
    const previous = modificationTimes.get(file);
    const current = getModificationTime(file);

    if (current !== previous) {
      modificationTimes.set(file, current);
      changed = true;
    }
  });
  modificationTimes.forEach((_, file) => {
    if (!currentSet.has(file)) {
      modificationTimes.delete(file);
      changed = true;
    }
  });

  if (changed) sendReload();
}, 250);

const keepAlive = setInterval(() => {
  reloadClients.forEach((response) => response.write(': keep-alive\n\n'));
}, 15000);

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);

  if (requestUrl.pathname === '/__reload') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    response.write(': connected\n\n');
    reloadClients.add(response);
    request.on('close', () => reloadClients.delete(response));
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  const pathSegments = pathname.split('/').filter(Boolean);

  const isFrontendPath = pathname === '/index.html' || pathname.startsWith('/assets/');
  if (!isFrontendPath || pathSegments.some((segment) => segment.startsWith('.'))) {
    response.writeHead(404).end('Not found');
    return;
  }

  const filePath = path.resolve(root, `.${pathname}`);

  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let fileStats;
  try {
    fileStats = statSync(filePath);
  } catch {
    response.writeHead(404).end('Not found');
    return;
  }

  if (!fileStats.isFile()) {
    response.writeHead(404).end('Not found');
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const headers = {
    'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  };

  if (extension === '.html') {
    const html = readFileSync(filePath, 'utf8').replace('</body>', `${reloadScript}\n</body>`);
    response.writeHead(200, headers).end(html);
    return;
  }

  response.writeHead(200, headers);
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Live site: http://localhost:${port}`);
  console.log(`Serving: ${root}`);
});

function shutdown() {
  clearInterval(watcher);
  clearInterval(keepAlive);
  reloadClients.forEach((response) => response.end());
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
