# Privacy Statement

## Overview

Swiggy Office Lunch Slack Demo is a prototype for coordinating office lunch orders through Slack. The current implementation uses mock catalog data and a mock Swiggy adapter.

## Data Processed

The prototype may process:

- Slack team id, channel id, user id, and username.
- Slash command text.
- Lunch run details such as office location, headcount, budget, delivery deadline, and dietary rules.
- Participant meal choices.
- Mock provider order ids.

## Data Not Processed

The prototype does not intentionally process:

- Payment card data.
- Live Swiggy account credentials.
- Live customer addresses.
- Live phone numbers.
- Government identifiers.

## Storage

The current prototype stores order state in memory only. Data is lost when the process restarts.

## Secrets

Secrets must be supplied through environment variables. The app does not return secret values from diagnostics.

## Retention

Prototype data is retained only for the lifetime of the running process. A production deployment should define explicit retention periods for orders, audit logs, and provider reconciliation data.

## Deletion

For the prototype, restarting the process clears in-memory data. A production deployment should add tenant/user deletion and export workflows before handling live user data.
