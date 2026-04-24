import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { appDiagnostics } from './config.js';
import { createDemoServices } from './demoServices.js';
import { createSecureToken, verifySessionCsrf } from './security.js';
import {
  createSlackIntegration,
  parseSlackForm,
  verifySlackRequest,
} from './slackIntegration.js';
import { createSwiggyAdapter } from './swiggyAdapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const SESSION_COOKIE = 'swiggy_demo_session';
const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_HEADERS = {
  'content-security-policy':
    "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
};

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

function parseCookies(cookieHeader = '') {
  const cookies = new Map();
  for (const part of String(cookieHeader).split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey && rawValue.length > 0 && !cookies.has(rawKey)) {
      cookies.set(rawKey, rawValue.join('='));
    }
  }
  return cookies;
}

function jsonResponse(statusCode, payload, headers = {}) {
  return {
    body: JSON.stringify(payload),
    headers: {
      ...DEFAULT_HEADERS,
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
    statusCode,
  };
}

function textResponse(statusCode, body, contentType) {
  return {
    body,
    headers: {
      ...DEFAULT_HEADERS,
      'content-type': contentType,
    },
    statusCode,
  };
}

function emptyResponse(statusCode = 200) {
  return {
    body: '',
    headers: DEFAULT_HEADERS,
    statusCode,
  };
}

function routeError(error) {
  const message = error instanceof Error ? error.message : 'unknown_error';

  if (message === 'not_found') {
    return jsonResponse(404, { error: 'not_found' });
  }
  if (message === 'forbidden') {
    return jsonResponse(403, { error: 'forbidden' });
  }
  if (message.startsWith('invalid_')) {
    return jsonResponse(400, { error: message });
  }
  if (
    message.startsWith('policy_violation') ||
    message.startsWith('order_not_') ||
    message === 'order_not_collecting'
  ) {
    return jsonResponse(409, { error: message });
  }
  if (message.startsWith('swiggy_not_configured')) {
    return jsonResponse(503, { error: message });
  }
  if (message === 'swiggy_live_adapter_not_implemented') {
    return jsonResponse(501, { error: message });
  }

  return jsonResponse(500, { error: 'internal_error' });
}

function parseJsonBody(body) {
  if (!body) {
    return {};
  }

  if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
    throw new Error('invalid_body_too_large');
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error('invalid_json');
  }
}

function createSession({ sessions }) {
  const sessionId = createSecureToken(24);
  const session = {
    csrfToken: createSecureToken(24),
    role: 'organizer',
    tenantId: 'tenant-acme',
    userId: 'u-organizer',
    userName: 'Office Organizer',
  };
  sessions.set(sessionId, session);
  return { session, sessionId };
}

function requireSession({ headers, sessions }) {
  const cookies = parseCookies(headers.cookie);
  const sessionId = cookies.get(SESSION_COOKIE);
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session) {
    return {
      error: jsonResponse(401, { error: 'session_required' }),
      session: null,
    };
  }

  const csrf = verifySessionCsrf({
    expectedToken: session.csrfToken,
    providedToken: headers['x-demo-csrf'],
  });
  if (!csrf.ok) {
    return {
      error: jsonResponse(403, { error: csrf.reason }),
      session: null,
    };
  }

  return { error: null, session };
}

async function readStaticFile(urlPath) {
  const fileName = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const resolved = path.resolve(PUBLIC_DIR, fileName);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    return null;
  }

  const extension = path.extname(resolved);
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  };

  try {
    return textResponse(200, await readFile(resolved, 'utf8'), contentTypes[extension]);
  } catch {
    return null;
  }
}

export function createServer({
  env = process.env,
  slackResponsePoster,
  services = createDemoServices({ commerceAdapter: createSwiggyAdapter({ env }) }),
} = {}) {
  const sessions = new Map();
  const slack = createSlackIntegration({ postSlackResponse: slackResponsePoster, services });

  async function handle({ method = 'GET', path: requestPath = '/', headers = {}, body = '' }) {
    const normalizedHeaders = normalizeHeaders(headers);
    const url = new URL(requestPath, 'http://localhost');

    if (method === 'GET' && url.pathname === '/api/session') {
      const { session, sessionId } = createSession({ sessions });
      const secureCookie = env.NODE_ENV === 'production' ? '; Secure' : '';

      return jsonResponse(
        200,
        {
          csrfToken: session.csrfToken,
          tenantId: session.tenantId,
          user: {
            id: session.userId,
            name: session.userName,
            role: session.role,
          },
        },
        {
          'set-cookie': `${SESSION_COOKIE}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${secureCookie}`,
        },
      );
    }

    if (method === 'GET' && url.pathname === '/api/catalog') {
      return jsonResponse(200, services.catalog);
    }

    if (method === 'GET' && url.pathname === '/api/health') {
      return jsonResponse(200, {
        diagnostics: appDiagnostics(env),
        ok: true,
      });
    }

    if (url.pathname.startsWith('/slack/')) {
      if (method !== 'POST') {
        return jsonResponse(405, { error: 'method_not_allowed' });
      }

      const slackVerification = verifySlackRequest({
        body,
        env,
        headers: normalizedHeaders,
      });
      if (!slackVerification.ok) {
        return jsonResponse(slackVerification.statusCode, slackVerification.response);
      }

      try {
        const form = parseSlackForm(body);
        if (url.pathname === '/slack/commands') {
          return jsonResponse(200, slack.handleSlashCommand(form));
        }
        if (url.pathname === '/slack/interactions') {
          const interactionResponse = await slack.handleInteraction(form);
          return interactionResponse === null
            ? emptyResponse()
            : jsonResponse(200, interactionResponse);
        }
        return jsonResponse(404, { error: 'not_found' });
      } catch (error) {
        return routeError(error);
      }
    }

    if (method === 'GET' && url.pathname === '/favicon.ico') {
      return {
        body: '',
        headers: DEFAULT_HEADERS,
        statusCode: 204,
      };
    }

    if (method === 'GET' && !url.pathname.startsWith('/api/')) {
      const staticFile = await readStaticFile(url.pathname);
      return staticFile ?? textResponse(404, 'Not found', 'text/plain; charset=utf-8');
    }

    if (url.pathname.startsWith('/api/')) {
      const { error, session } = requireSession({
        headers: normalizedHeaders,
        sessions,
      });
      if (error) {
        return error;
      }

      try {
        const parsedBody = parseJsonBody(body);

        if (method === 'POST' && url.pathname === '/api/orders') {
          const order = services.orders.createOrderSession({
            ...parsedBody,
            organizerId: session.userId,
            organizerRole: session.role,
            tenantId: session.tenantId,
          });
          return jsonResponse(201, { order });
        }

        const choiceMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/choices$/);
        if (method === 'POST' && choiceMatch) {
          const idempotencyKey = normalizedHeaders['idempotency-key'];
          if (!idempotencyKey) {
            return jsonResponse(400, { error: 'idempotency_key_required' });
          }

          const order = services.orders.submitParticipantChoice({
            ...parsedBody,
            idempotencyKey,
            orderId: choiceMatch[1],
            tenantId: session.tenantId,
          });
          return jsonResponse(200, { order });
        }

        const lockMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/lock$/);
        if (method === 'POST' && lockMatch) {
          const order = services.orders.lockCart({
            actorId: session.userId,
            actorRole: session.role,
            orderId: lockMatch[1],
            tenantId: session.tenantId,
          });
          return jsonResponse(200, { order });
        }

        const approveMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/approve$/);
        if (method === 'POST' && approveMatch) {
          const result = services.orders.approveOrder({
            actorId: session.userId,
            actorRole: session.role,
            orderId: approveMatch[1],
            tenantId: session.tenantId,
          });
          return jsonResponse(200, result);
        }

        const placeMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/place$/);
        if (method === 'POST' && placeMatch) {
          const idempotencyKey = normalizedHeaders['idempotency-key'];
          if (!idempotencyKey) {
            return jsonResponse(400, { error: 'idempotency_key_required' });
          }

          const order = services.orders.placeOrder({
            actorId: session.userId,
            actorRole: session.role,
            approvalToken: parsedBody.approvalToken,
            idempotencyKey,
            orderId: placeMatch[1],
            tenantId: session.tenantId,
          });
          return jsonResponse(200, { order });
        }

        const summaryMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
        if (method === 'GET' && summaryMatch) {
          const order = services.orders.getOrderSummary({
            orderId: summaryMatch[1],
            tenantId: session.tenantId,
          });
          return jsonResponse(200, { order });
        }

        return jsonResponse(404, { error: 'not_found' });
      } catch (error) {
        return routeError(error);
      }
    }

    return jsonResponse(404, { error: 'not_found' });
  }

  return {
    async inject(request) {
      return handle(request);
    },

    listen(port = 4173, host = '127.0.0.1') {
      const httpServer = createHttpServer(async (request, response) => {
        let body = '';
        request.on('data', (chunk) => {
          body += chunk;
          if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
            request.destroy();
          }
        });
        request.on('end', async () => {
          const result = await handle({
            body,
            headers: request.headers,
            method: request.method,
            path: request.url,
          });

          response.writeHead(result.statusCode, result.headers);
          response.end(result.body);
        });
      });

      httpServer.listen(port, host, () => {
        console.log(`Swiggy office order demo running at http://${host}:${port}`);
      });

      return httpServer;
    },

    services,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.env.PORT ?? 4173);
  createServer().listen(port);
}
