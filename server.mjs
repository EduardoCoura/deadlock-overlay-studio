import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4747;
const HOST = process.env.HOST || '127.0.0.1';
const UPSTREAM_API = 'https://api.deadlock-api.com';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const apiCache = new Map();

function getCacheTtlMs(apiPath) {
  if (apiPath.startsWith('/v1/assets/')) return 6 * 60 * 60_000;
  if (apiPath.startsWith('/v1/leaderboard/')) return 5 * 60_000;
  if (apiPath.startsWith('/v1/matches/active')) return 15_000;
  return 20_000;
}

async function handleApiProxy(req, res) {
  const apiPath = req.url.slice('/api'.length) || '/';
  if (!apiPath.startsWith('/v1/')) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Rota de API inválida' }));
    return;
  }

  const forceBypass = req.headers['x-bypass-cache'] === '1';
  const cached = apiCache.get(apiPath);
  const ttl = getCacheTtlMs(apiPath);
  if (!forceBypass && cached && Date.now() - cached.ts < ttl) {
    res.writeHead(cached.status, {
      'Content-Type': cached.contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'X-Proxy-Cache': 'HIT',
    });
    res.end(cached.body);
    return;
  }

  const upstreamUrl = `${UPSTREAM_API}${apiPath}`;
  try {
    let upstreamRes = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      upstreamRes = await fetch(upstreamUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DeadlockOverlayStudio/1.0',
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (upstreamRes.status !== 503 || attempt === 1) break;
      await new Promise((r) => setTimeout(r, 800));
    }

    const contentType = upstreamRes.headers.get('content-type') || 'application/json; charset=utf-8';
    const body = Buffer.from(await upstreamRes.arrayBuffer());

    // Cache valid responses (including 429 match-history fallback JSON array)
    if (upstreamRes.ok || (upstreamRes.status === 429 && apiPath.includes('/match-history'))) {
      apiCache.set(apiPath, { ts: Date.now(), status: upstreamRes.status, contentType, body });
    }

    res.writeHead(upstreamRes.status, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'X-Proxy-Cache': 'MISS',
    });
    res.end(body);
  } catch (err) {
    if (cached) {
      res.writeHead(cached.status, {
        'Content-Type': cached.contentType,
        'Access-Control-Allow-Origin': '*',
        'X-Proxy-Cache': 'STALE',
      });
      res.end(cached.body);
      return;
    }
    res.writeHead(502, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: `Falha ao conectar em ${UPSTREAM_API}: ${err.message}` }));
  }
}

function resolveSafePath(urlPathname) {
  const clean = decodeURIComponent(urlPathname.split('?')[0]);
  const relative = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  const resolved = path.resolve(__dirname, relative);
  if (!resolved.startsWith(__dirname + path.sep) && resolved !== path.join(__dirname, 'index.html')) {
    return null;
  }
  return resolved;
}

const server = http.createServer(async (req, res) => {
  if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  if (req.url.startsWith('/api/')) {
    await handleApiProxy(req, res);
    return;
  }

  let filePath = resolveSafePath(req.url);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const data = await fs.readFile(filePath);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n  Servidor já está ativo na porta ${PORT}! Acesse: http://${HOST}:${PORT}/\n`);
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Deadlock Overlay Studio rodando em: http://${HOST}:${PORT}/`);
  console.log(`  Proxy local de API ativo em: http://${HOST}:${PORT}/api/v1/...`);
  console.log(`  Para usar no OBS, copie a URL gerada dentro do editor (?obs=1&...)`);
  console.log(`  Pressione Ctrl+C para encerrar.\n`);
});
