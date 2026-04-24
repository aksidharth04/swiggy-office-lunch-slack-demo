# Swiggy MCP Application Packet

This document summarizes the application details for the Swiggy Office Lunch Slack Demo.

## Applicant Profile

- Applicant type: Individual developer
- Name: Adicherikandi Sidharth
- GitHub: https://github.com/aksidharth04
- Repository: https://github.com/aksidharth04/swiggy-office-lunch-slack-demo
- Security contact: aksidharthm10@gmail.com

## What Is Being Built

Swiggy Office Lunch Slack Demo is a Slack-native group ordering workflow for office lunch runs. The app lets an office organizer start a lunch run from Slack, collect employee meal choices through Block Kit buttons, lock the cart, approve the order, and place a provider order through a Swiggy adapter boundary.

The current implementation is a secure mock prototype. It uses deterministic local catalog data and a mock Swiggy adapter so the product workflow can be reviewed safely before live Swiggy MCP credentials or production provider APIs are enabled.

## Use Case

The target use case is workplace group meal coordination:

1. An office organizer creates a lunch run in Slack with headcount, budget, office location, deadline, and dietary rules.
2. Employees submit meal choices directly in Slack.
3. The organizer locks the cart after choices are collected.
4. The app validates policy constraints such as budget and dietary rules.
5. The organizer approves and places the order through the provider adapter.

This reduces manual coordination, keeps ordering approvals inside Slack, and creates an auditable workflow for office admins.

## Integration Architecture Overview

The app is a Node.js HTTP service with three main surfaces:

- Slack command endpoint: `POST /slack/commands`
- Slack interactivity endpoint: `POST /slack/interactions`
- Local debug/API surface: `/api/*`

High-level flow:

```text
Slack /swiggy-lunch
  -> signed Slack command request
  -> order workflow service
  -> in-memory store boundary
  -> Slack Block Kit response
  -> participant and organizer interactions
  -> Swiggy adapter boundary
  -> mock provider order id
```

Core modules:

- `src/server.js`: HTTP routing, static assets, API responses, health diagnostics.
- `src/slackIntegration.js`: Slack signature verification, command parsing, Block Kit rendering, interaction handling.
- `src/demoServices.js`: order lifecycle, policy checks, approval and placement workflow.
- `src/store.js`: replaceable in-memory store for orders, idempotency results, and audit events.
- `src/swiggyAdapter.js`: mock/live adapter boundary for catalog, recommendations, and order placement.
- `src/security.js`: Slack HMAC verification, CSRF verification, secure token generation, audit redaction.
- `src/config.js`: adapter readiness and safe diagnostics.

## Authentication And Redirect URIs

Current prototype:

- Slack authentication model: signed Slack requests using `SLACK_SIGNING_SECRET`.
- Slack slash command URL: `https://YOUR_PUBLIC_DOMAIN/slack/commands`
- Slack interactivity URL: `https://YOUR_PUBLIC_DOMAIN/slack/interactions`
- OAuth redirect URI: not used by the current Slack manifest because the prototype uses slash commands with the `commands` bot scope and signed request verification.

Planned production values to provide before review or deployment:

- Production base URL: `https://YOUR_PUBLIC_DOMAIN`
- Slack command URL: `https://YOUR_PUBLIC_DOMAIN/slack/commands`
- Slack interactivity URL: `https://YOUR_PUBLIC_DOMAIN/slack/interactions`
- Swiggy MCP OAuth redirect URI, if required by Swiggy MCP: `https://YOUR_PUBLIC_DOMAIN/auth/swiggy/callback`

## Static IP Ranges Or Gateway IPs

Current prototype:

- Local development has no static egress IP.
- The mock adapter does not make outbound Swiggy network calls.

Production plan:

- If Swiggy MCP requires IP allowlisting, deploy behind a provider that supports stable outbound egress, such as a NAT gateway, fixed egress proxy, or platform static outbound IP.
- Static IPs will be supplied before enabling live Swiggy placement.
- Until static egress is configured, the app should remain in `SWIGGY_ADAPTER_MODE=mock`.

## Security Contact

- Security contact: aksidharthm10@gmail.com
- Preferred subject prefix: `[Swiggy Office Lunch Security]`

## Data Handling And Privacy Declaration

The current mock implementation processes minimal demo data:

- Slack team id, Slack user id, Slack username, channel id, and command text.
- Lunch run fields: office location id, budget, headcount, delivery deadline, dietary rules.
- Participant meal choices.
- Mock provider order id.

Security and privacy controls:

- Slack requests are verified with HMAC signatures and replay-window checks.
- State-changing debug API calls require CSRF tokens.
- Orders are tenant-scoped.
- Organizer-only actions are enforced server-side.
- Approval tokens are generated server-side and are not rendered in Slack.
- Idempotency keys are used for choice submission and order placement.
- Audit events redact address, phone, token, secret, authorization, cookie, password, and credential-like fields.
- Diagnostics report readiness booleans and missing key names but never secret values.

Current storage:

- Data is stored in memory only.
- Data is lost when the process restarts.
- No production database is configured in the current prototype.

Production data plan:

- Persist only fields required for order coordination, policy enforcement, auditability, and provider reconciliation.
- Encrypt secrets in environment or secret-manager storage.
- Avoid storing payment credentials in this app.
- Apply retention limits for lunch run records and audit logs before production launch.
- Provide deletion/export processes if the app is expanded beyond prototype scope.

See `PRIVACY.md` for the repository privacy statement.

## Environment And Infrastructure Setup

Runtime:

- Node.js `>=20`
- HTTP service defaults to `127.0.0.1:4173`
- Slack app manifest: `slack-app-manifest.example.json`

Required local environment:

```bash
SLACK_SIGNING_SECRET=local-dev-secret
SWIGGY_ADAPTER_MODE=mock
```

Planned live Swiggy environment:

```bash
SWIGGY_ADAPTER_MODE=swiggy
SWIGGY_API_BASE_URL=<provided-by-swiggy>
SWIGGY_CLIENT_ID=<provided-by-swiggy>
SWIGGY_CLIENT_SECRET=<provided-by-swiggy>
```

Operational diagnostics:

- `GET /api/health` returns safe readiness details.
- `npm test` runs the automated test suite.
- `npm run check` runs syntax checks.
- `npm run slack:smoke` runs a signed local Slack endpoint rehearsal.

## Swiggy MCP Terms Acknowledgement

The applicant acknowledges that live Swiggy MCP access, credentials, APIs, data, and brand usage must follow the applicable Swiggy MCP terms, developer policies, acceptable-use requirements, and any additional review conditions provided by Swiggy.

The current repository does not include live Swiggy credentials and does not make live Swiggy network calls.

## Security Audit Summary

Automated verification:

- `npm test`: 27 passing tests.
- `npm run check`: syntax checks passing.
- Signed local Slack smoke flow verified end-to-end against the local server.

Security controls covered by tests or implementation:

- Slack request signature validation.
- Slack replay-window rejection.
- CSRF validation for state-changing debug API calls.
- Tenant-scoped order lookup.
- Organizer/admin authorization for lock, approve, and place.
- Approval-before-placement enforcement.
- Idempotent order placement.
- Policy violation blocking for budget and dietary constraints.
- Audit redaction of sensitive fields.
- Safe diagnostics that do not expose secret values.
- Explicit live-adapter missing-config errors.

Known limitations:

- No third-party penetration test has been performed.
- No production database or production secret manager is configured in this prototype.
- No live Swiggy API calls are implemented until Swiggy MCP details are available.

## SOC2 / ISO Certification

SOC2 and ISO certifications are not available for this individual prototype.

If the project moves into a company-operated production deployment, the deployment owner should provide current compliance documentation or complete the relevant vendor security questionnaire.

## Expected Traffic And Scaling Plan

Expected prototype traffic:

- Small Slack workspace demos.
- Low-volume internal lunch runs.
- Expected request volume: under 1,000 Slack/API requests per day during review or pilot usage.

Production scaling plan:

- Replace in-memory storage with a managed database.
- Use stateless HTTP instances behind a load balancer.
- Move idempotency records and audit logs into durable storage.
- Add queueing/retry behavior around provider placement.
- Add request rate limiting at the edge and app layers.
- Add structured logging and alerting for provider failures.
- Use fixed outbound egress if Swiggy MCP requires IP allowlisting.

## Submission Readiness Notes

Before submitting this packet, replace these placeholders with final production values if available:

- `https://YOUR_PUBLIC_DOMAIN`
- Swiggy MCP OAuth redirect URI, if required.
- Static outbound IPs, if required.
- Production deployment provider and region.
- Any company compliance documentation, if applicable.
