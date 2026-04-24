import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SLACK_REPLAY_WINDOW_SECONDS = 300;
const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN = /(address|phone|token|secret|authorization|cookie|password|credential)/i;

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSecureToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function verifySlackSignature({
  body,
  signature,
  signingSecret,
  timestamp,
  now = Date.now(),
}) {
  if (!body || !signature || !signingSecret || !timestamp) {
    return { ok: false, reason: 'missing_signature_fields' };
  }

  const requestTime = Number(timestamp);
  if (!Number.isFinite(requestTime)) {
    return { ok: false, reason: 'invalid_timestamp' };
  }

  const ageSeconds = Math.abs(Math.floor(now / 1000) - requestTime);
  if (ageSeconds > SLACK_REPLAY_WINDOW_SECONDS) {
    return { ok: false, reason: 'stale_timestamp' };
  }

  const expectedSignature = `v0=${createHmac('sha256', signingSecret)
    .update(`v0:${timestamp}:${body}`)
    .digest('hex')}`;

  if (!safeEqual(expectedSignature, signature)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  return { ok: true };
}

export function verifySessionCsrf({ expectedToken, providedToken }) {
  if (!expectedToken || !providedToken) {
    return { ok: false, reason: 'csrf_missing' };
  }

  if (!safeEqual(expectedToken, providedToken)) {
    return { ok: false, reason: 'csrf_mismatch' };
  }

  return { ok: true };
}

export function redactSensitiveFields(input) {
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveFields(item));
  }

  if (!input || typeof input !== 'object') {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactSensitiveFields(value),
    ]),
  );
}
