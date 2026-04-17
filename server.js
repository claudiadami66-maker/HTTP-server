/**
 * server.js
 * Serveur HTTP Node.js natif — sans framework
 * Gère : fichiers statiques, routing, headers, status codes, logs
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const { handleApiRoutes } = require('./routes/api');

// ─── Configuration ──────────────────────────────────────────────────────────
const CONFIG = {
  port:      process.env.PORT || 3000,
  host:      '0.0.0.0',
  publicDir: path.join(__dirname, 'public'),
};

// ─── Types MIME supportés ────────────────────────────────────────────────────
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ─── Logger ──────────────────────────────────────────────────────────────────
function log(method, url, statusCode) {
  const timestamp = new Date().toISOString();
  const statusLabel = statusCode >= 400 ? `\x1b[31m${statusCode}\x1b[0m`
                    : statusCode >= 300 ? `\x1b[33m${statusCode}\x1b[0m`
                    :                     `\x1b[32m${statusCode}\x1b[0m`;
  console.log(`[${timestamp}]  ${method.padEnd(6)} ${url.padEnd(30)} ${statusLabel}`);
}

// ─── Envoi d'une réponse HTTP ────────────────────────────────────────────────
function sendResponse(res, statusCode, contentType, body) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf-8');

  res.writeHead(statusCode, {
    'Content-Type':                contentType,
    'Content-Length':              buffer.length,
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options':      'nosniff',
    'X-Frame-Options':             'DENY',
    'Cache-Control':               'no-cache',
  });

  res.end(buffer);
}

// ─── Lecture et envoi d'un fichier statique ──────────────────────────────────
function serveFile(req, res, filePath) {
  // Sécurité : bloquer les path traversal (../../etc/passwd)
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(CONFIG.publicDir)) {
    log(req.method, req.url, 403);
    sendResponse(res, 403, 'text/plain; charset=utf-8', '403 - Accès interdit');
    return;
  }

  fs.readFile(normalized, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fichier introuvable → page 404 personnalisée
        fs.readFile(path.join(CONFIG.publicDir, '404.html'), (e, html) => {
          log(req.method, req.url, 404);
          sendResponse(res, 404, 'text/html; charset=utf-8', html || '404 - Page introuvable');
        });
      } else {
        log(req.method, req.url, 500);
        sendResponse(res, 500, 'text/plain; charset=utf-8', '500 - Erreur interne du serveur');
      }
      return;
    }

    const ext         = path.extname(normalized).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    log(req.method, req.url, 200);
    sendResponse(res, 200, contentType, data);
  });
}

// ─── Résolution de l'URL vers un chemin fichier ──────────────────────────────
function resolveFilePath(url) {
  const parsed   = new URL(url, `http://${CONFIG.host}`);
  const pathname = parsed.pathname;

  if (pathname === '/') return path.join(CONFIG.publicDir, 'index.html');

  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  return path.join(CONFIG.publicDir, safePath);
}

// ─── Serveur principal ───────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const { method, url } = req;

  // Preflight CORS
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Routes API
  if (url.startsWith('/api')) {
    handleApiRoutes(req, res, sendResponse, log);
    return;
  }

  // Fichiers statiques : GET uniquement
  if (method !== 'GET') {
    log(method, url, 405);
    sendResponse(res, 405, 'text/plain; charset=utf-8', '405 - Méthode non autorisée');
    return;
  }

  serveFile(req, res, resolveFilePath(url));
});

// ─── Démarrage ───────────────────────────────────────────────────────────────
server.listen(CONFIG.port, CONFIG.host, () => {
  console.log('\x1b[36m%s\x1b[0m', '╔══════════════════════════════════════╗');
  console.log('\x1b[36m%s\x1b[0m', '║       🚀  Serveur HTTP démarré        ║');
  console.log('\x1b[36m%s\x1b[0m', '╚══════════════════════════════════════╝');
  console.log(`\n  URL : \x1b[4mhttp://${CONFIG.host}:${CONFIG.port}\x1b[0m\n`);
  console.log('─'.repeat(60));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${CONFIG.port} déjà utilisé. Modifie CONFIG.port dans server.js\n`);
  } else {
    console.error('Erreur serveur :', err.message);
  }
  process.exit(1);
});

// Arrêt propre avec Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n  Arrêt du serveur... bye 👋\n');
  server.close(() => process.exit(0));
});