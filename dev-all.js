import { spawn } from 'node:child_process';

const commands = [
  ['site', ['dev-server.js']],
  ['api', ['server/src/server.js']],
];

let shuttingDown = false;

const children = commands.map(([name, args]) => {
  const child = spawn(process.execPath, args, { stdio: ['inherit', 'pipe', 'pipe'] });
  child.stdout.on('data', (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) shutdown(code || 1);
  });
  return child;
});

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach((child) => child.kill());
  windowExit(code);
}

function windowExit(code) {
  setTimeout(() => process.exit(code), 100);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
