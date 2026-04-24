# Security Policy

## Supported Scope

This repository is a prototype Slack office lunch workflow with a mock Swiggy adapter. It is suitable for local demos and integration review, not live production food ordering without additional deployment hardening and live provider implementation.

## Security Contact

Please report security issues to:

- aksidharthm10@gmail.com

Use the subject prefix:

```text
[Swiggy Office Lunch Security]
```

## Security Controls

- Slack request signing verification with replay-window protection.
- CSRF checks for state-changing debug API requests.
- HttpOnly demo session cookie.
- Tenant-scoped order lookup.
- Organizer/admin authorization for lock, approve, and place actions.
- Explicit approval token before provider placement.
- Idempotency keys for participant choices and order placement.
- Input validation for order and participant fields.
- Sensitive audit-field redaction.
- Conservative browser security headers.
- Safe health diagnostics that do not return secret values.

## Known Prototype Limitations

- In-memory storage only.
- No production database migration.
- No live Swiggy network calls.
- No third-party security audit.
- No SOC2 or ISO certification for this individual prototype.

## Verification

Run:

```bash
npm test
npm run check
```
