import test from 'node:test';
import assert from 'node:assert/strict';

import { appDiagnostics, swiggyReadiness } from '../src/config.js';

test('swiggy readiness defaults to mock mode without requiring credentials', () => {
  assert.deepEqual(swiggyReadiness({}), {
    missing: [],
    mode: 'mock',
    ok: true,
    provider: 'Swiggy Mock',
  });
});

test('swiggy readiness reports missing live credentials without leaking values', () => {
  assert.deepEqual(
    swiggyReadiness({
      SWIGGY_ADAPTER_MODE: 'swiggy',
      SWIGGY_CLIENT_SECRET: 'secret-value',
    }),
    {
      missing: ['SWIGGY_API_BASE_URL', 'SWIGGY_CLIENT_ID'],
      mode: 'swiggy',
      ok: false,
      provider: 'Swiggy Builders Club',
    },
  );
});

test('app diagnostics report readiness booleans but not secret values', () => {
  const diagnostics = appDiagnostics({
    SLACK_SIGNING_SECRET: 'slack-secret',
    SWIGGY_ADAPTER_MODE: 'swiggy',
    SWIGGY_API_BASE_URL: 'https://swiggy.test',
    SWIGGY_CLIENT_ID: 'client-id',
    SWIGGY_CLIENT_SECRET: 'client-secret',
  });

  assert.equal(diagnostics.slack.signingSecretConfigured, true);
  assert.equal(diagnostics.swiggy.ok, true);
  assert.equal(JSON.stringify(diagnostics).includes('client-secret'), false);
});
