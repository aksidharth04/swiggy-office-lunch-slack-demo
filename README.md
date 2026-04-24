# Swiggy Office Lunch Slack Demo

A secure mock prototype for a native Slack office group ordering workflow built for the Swiggy Builders Club idea.

## Application Materials

- [Application packet](APPLICATION.md)
- [Security policy](SECURITY.md)
- [Privacy statement](PRIVACY.md)

## Pitch Demo

```bash
SLACK_SIGNING_SECRET=local-dev-secret npm start
```

The primary surface is Slack:

- Slash command: `POST /slack/commands`
- Button/interactivity endpoint: `POST /slack/interactions`

The browser page at `http://127.0.0.1:4173` is now only a debug console.

For a local rehearsal, run the signed Slack smoke script in another terminal:

```bash
SLACK_SIGNING_SECRET=local-dev-secret npm run slack:smoke
```

The smoke script creates a lunch run, submits two employee choices, locks the cart, approves it, places the mock Swiggy order, and prints a short transcript with the provider order id.

## Local Diagnostics

```bash
curl http://127.0.0.1:4173/api/health
```

The health response reports Slack signing readiness and Swiggy adapter mode without returning secret values.

## Native Slack Setup

1. Create a Slack app from `slack-app-manifest.example.json`.
2. Replace `https://YOUR_PUBLIC_TUNNEL` with your public tunnel URL.
3. Set the app's signing secret locally:

```bash
export SLACK_SIGNING_SECRET="your-slack-signing-secret"
npm start
```

4. Install the app to a workspace.
5. In Slack, run:

```text
/swiggy-lunch for 12 ₹250 by 13:15 veg
```

Slack will render the whole flow with Block Kit buttons:

1. Employees choose meals.
2. Organizer locks the cart.
3. Organizer approves.
4. Organizer places the mock Swiggy order.

Try:

```text
/swiggy-lunch for 12 ₹250 by 13:15 veg
/swiggy-lunch office koramangala for 6 ₹300 by 13:30 mixed
/swiggy-lunch help
```

## Local Slack Webhook Smoke

In one terminal:

```bash
SLACK_SIGNING_SECRET=local-dev-secret npm start
```

In another:

```bash
SLACK_SIGNING_SECRET=local-dev-secret npm run slack:smoke
```

## Test

```bash
npm test
npm run check
```

## Demo Flow

1. Slack slash command creates a lunch run with office, budget, headcount, deadline, and dietary rule.
2. Slack message buttons collect employee meal choices.
3. Organizer-only button locks the cart.
4. Organizer-only button approves the order.
5. Organizer-only button places the mock Swiggy order.

Slack messages show the current state, next step, restaurant recommendations, submitted choices, policy status, final total, and mock provider order id.

## Security Controls In The Mock

- Slack request signature verification with replay-window checks.
- Native Slack slash command and interaction endpoints reject forged requests.
- HttpOnly demo session cookie.
- CSRF token required for state-changing API calls.
- Tenant-scoped order lookup.
- Organizer/admin checks for lock, approval, and placement.
- Non-organizers can choose meals but cannot lock, approve, or place.
- Explicit server-side approval token before fake order placement.
- Idempotency keys for participant choices and order placement.
- Input validation for budget, deadline, headcount, office, menu items, and participant names.
- Audit log redaction for address, phone, token, secret, and credential-like fields.
- Conservative browser security headers, including CSP, frame blocking, no-referrer, and nosniff.

## Swiggy Adapter Boundary

The current adapter seam lives in [src/swiggyAdapter.js](/Users/aksidharth/Documents/New%20project/src/swiggyAdapter.js). The app defaults to `SWIGGY_ADAPTER_MODE=mock`, which keeps the current demo behavior. When Builders Club access lands, switch to `SWIGGY_ADAPTER_MODE=swiggy` and implement the live adapter methods there without changing the Slack flow, policy engine, or approval logic.

Live mode currently validates configuration and then fails explicitly with `swiggy_live_adapter_not_implemented` for placement. That is intentional: the app has the provider contract ready, but it does not guess at private Swiggy API details.

Planned live credentials:

- `SWIGGY_ADAPTER_MODE=swiggy`
- `SWIGGY_API_BASE_URL`
- `SWIGGY_CLIENT_ID`
- `SWIGGY_CLIENT_SECRET`
