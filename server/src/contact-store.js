import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export function createContactStore(dataFile) {
  return {
    async save(contact) {
      await mkdir(path.dirname(dataFile), { recursive: true });
      await appendFile(dataFile, `${JSON.stringify(contact)}\n`, { encoding: 'utf8', mode: 0o600 });
    },
  };
}
