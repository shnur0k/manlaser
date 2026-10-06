import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const CONTENT_DIR = path.join(ROOT, 'content');
export const ASSETS_DIR = path.join(ROOT, 'assets');
export const LOGO_FILE = path.join(ASSETS_DIR, 'logo.svg');
