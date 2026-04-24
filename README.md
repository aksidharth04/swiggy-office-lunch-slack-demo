# Swiggy Office Lunch Slack Demo

A Slack-native prototype for coordinating office lunch orders with Swiggy Food.

## Demo

[Watch or download the 15-second Slack workflow MP4](https://raw.githubusercontent.com/aksidharth04/swiggy-office-lunch-slack-demo/main/video/output/swiggy-office-lunch-openai-style.mp4)

## Overview

The organizer starts a lunch run with `/swiggy-lunch`. Employees choose meals from the Slack message, then the organizer locks the cart, approves it, and places a mock Swiggy order.

The backend verifies signed Slack requests, keeps tenant-scoped order state, enforces budget and approval rules, and renders the workflow with Slack Block Kit. The Swiggy integration is isolated behind a provider adapter, so the current mock mode can be replaced with live Swiggy MCP access later.

## Local Run

```bash
SLACK_SIGNING_SECRET=local-dev-secret npm start
```

Slack endpoints:

- `POST /slack/commands`
- `POST /slack/interactions`

Smoke test:

```bash
SLACK_SIGNING_SECRET=local-dev-secret npm run slack:smoke
```

## Checks

```bash
npm run check
npm test
```
