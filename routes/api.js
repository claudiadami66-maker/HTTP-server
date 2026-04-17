/**
 * routes/api.js
 * Gestion de toutes les routes /api/*
 */

'use strict';

const MAX_BODY_SIZE = 1_000_000; // 1 MB

// ─── Lecture du body (requêtes POST) ─────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw  = '';
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        return;
      }
      raw += chunk.toString('utf-8');
    });

    req.on('end',   () => resolve(raw));
    req.on('error', reject);
  });
}

// ─── Parse JSON sécurisé ──────────────────────────────────────────────────────
function parseJSON(raw) {
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

// ─── Routeur API ──────────────────────────────────────────────────────────────
async function handleApiRoutes(req, res, sendResponse, log) {
  const { method, url } = req;

  // Enlève les query strings pour le matching : /api/data?x=1 → /api/data
  const pathname = url.split('?')[0];

  // ── GET /api/status ── santé du serveur
  if (pathname === '/api/status' && method === 'GET') {
    const body = JSON.stringify({
      success:   true,
      status:    'online',
      uptime:    `${Math.floor(process.uptime())}s`,
      timestamp: new Date().toISOString(),
    }, null, 2);
    log(method, url, 200);
    sendResponse(res, 200, 'application/json', body);
    return;
  }

  // ── GET /api/data ── liste de données fictives
  if (pathname === '/api/data' && method === 'GET') {
    const body = JSON.stringify({
      success: true,
      count:   3,
      items: [
        { id: 1, nom: 'Node.js',  type: 'runtime'   },
        { id: 2, nom: 'HTTP',     type: 'protocole'  },
        { id: 3, nom: 'REST API', type: 'architecture' },
      ],
      timestamp: new Date().toISOString(),
    }, null, 2);
    log(method, url, 200);
    sendResponse(res, 200, 'application/json', body);
    return;
  }

  // ── POST /api/echo ── renvoie le body reçu
  if (pathname === '/api/echo' && method === 'POST') {
    let raw;
    try {
      raw = await readBody(req);
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') {
        log(method, url, 413);
        sendResponse(res, 413, 'application/json', JSON.stringify({ success: false, error: 'Payload trop volumineux (max 1MB)' }));
      } else {
        log(method, url, 500);
        sendResponse(res, 500, 'application/json', JSON.stringify({ success: false, error: 'Erreur lecture du body' }));
      }
      return;
    }

    const parsed = parseJSON(raw);
    if (!parsed.ok) {
      log(method, url, 400);
      sendResponse(res, 400, 'application/json', JSON.stringify({
        success: false,
        error:   'JSON invalide. Vérifie le body de ta requête.',
      }));
      return;
    }

    const body = JSON.stringify({
      success:    true,
      echo:       parsed.data,
      receivedAt: new Date().toISOString(),
    }, null, 2);
    log(method, url, 201);
    sendResponse(res, 201, 'application/json', body);
    return;
  }

  // ── Route inconnue ────────────────────────────────────────────────────────
  log(method, url, 404);
  sendResponse(res, 404, 'application/json', JSON.stringify({
    success: false,
    error:   `Route '${method} ${pathname}' introuvable.`,
    routes:  ['GET /api/status', 'GET /api/data', 'POST /api/echo'],
  }));
}

module.exports = { handleApiRoutes };