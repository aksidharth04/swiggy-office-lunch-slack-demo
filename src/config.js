const REQUIRED_SWIGGY_LIVE_KEYS = [
  'SWIGGY_API_BASE_URL',
  'SWIGGY_CLIENT_ID',
  'SWIGGY_CLIENT_SECRET',
];

export function swiggyModeFromEnv(env = process.env) {
  return env.SWIGGY_ADAPTER_MODE === 'swiggy' ? 'swiggy' : 'mock';
}

export function swiggyReadiness(env = process.env) {
  const mode = swiggyModeFromEnv(env);
  if (mode !== 'swiggy') {
    return {
      missing: [],
      mode,
      ok: true,
      provider: 'Swiggy Mock',
    };
  }

  const missing = REQUIRED_SWIGGY_LIVE_KEYS.filter((key) => !env[key]);
  return {
    missing,
    mode,
    ok: missing.length === 0,
    provider: 'Swiggy Builders Club',
  };
}

export function appDiagnostics(env = process.env) {
  const swiggy = swiggyReadiness(env);
  return {
    slack: {
      signingSecretConfigured: Boolean(env.SLACK_SIGNING_SECRET),
    },
    swiggy,
  };
}

export function createConfigError(code, detail) {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  error.detail = detail;
  return error;
}

export { REQUIRED_SWIGGY_LIVE_KEYS };
