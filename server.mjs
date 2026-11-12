import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'",
};
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};
export function createStaticServer(directory = 'dist') {
  const root = resolve(directory);
  return createServer(async (request, response) => {
    Object.entries(securityHeaders).forEach(([name, value]) => response.setHeader(name, value));
    response.setHeader('Cache-Control', 'no-cache');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname.split('/').some((part) => part.startsWith('.')) || pathname.includes('\\')) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const candidate = resolve(root, '.' + pathname);
      if (candidate !== root && !candidate.startsWith(root + sep)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const file = await realpath(
        (await stat(candidate)).isDirectory() ? resolve(candidate, 'index.html') : candidate,
      );
      if (!file.startsWith(root + sep)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
      const data = await readFile(file);
      response.setHeader('Content-Length', data.length);
      response.writeHead(200);
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
}
