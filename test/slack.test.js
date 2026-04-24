import { createHmac } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createServer } from '../src/server.js';
import { parseLunchCommandText } from '../src/slackIntegration.js';

const SIGNING_SECRET = 'test-slack-signing-secret';

function signSlackBody(body, timestamp = String(Math.floor(Date.now() / 1000))) {
  const signature = `v0=${createHmac('sha256', SIGNING_SECRET)
    .update(`v0:${timestamp}:${body}`)
    .digest('hex')}`;

  return {
    signature,
    timestamp,
  };
}

async function signedSlackPost(app, path, body) {
  const { signature, timestamp } = signSlackBody(body);
  return app.inject({
    method: 'POST',
    path,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-slack-request-timestamp': timestamp,
      'x-slack-signature': signature,
    },
    body,
  });
}

function slashCommandBody(text = 'team lunch for 4 ₹250 deliver by 13:15 veg') {
  return new URLSearchParams({
    channel_id: 'C123',
    channel_name: 'team-lunch',
    command: '/swiggy-lunch',
    team_domain: 'acme',
    team_id: 'T123',
    text,
    trigger_id: 'trigger-1',
    user_id: 'UORG',
    user_name: 'organizer',
  }).toString();
}

function interactionBody(payload) {
  return new URLSearchParams({
    payload: JSON.stringify({
      channel: { id: 'C123' },
      response_url: 'https://hooks.slack.test/response',
      team: { id: 'T123' },
      trigger_id: `trigger-${Date.now()}`,
      type: 'block_actions',
      user: { id: 'UORG', username: 'organizer' },
      ...payload,
    }),
  }).toString();
}

function interactionBodyWithoutResponseUrl(payload) {
  const body = JSON.parse(new URLSearchParams(interactionBody(payload)).get('payload'));
  delete body.response_url;
  return new URLSearchParams({
    payload: JSON.stringify(body),
  }).toString();
}

function findAction(payload, actionIdPrefix) {
  for (const block of payload.blocks ?? []) {
    for (const element of block.elements ?? []) {
      if (element.action_id?.startsWith(actionIdPrefix)) {
        return element;
      }
    }
  }
  return null;
}

function extractOrderId(payload) {
  const action = findAction(payload, 'choose_item_') ?? findAction(payload, 'lock_cart');
  assert.ok(action, 'expected Slack payload to include an order action');
  return action.value.split(':')[0];
}

function assertUniqueActionIds(payload) {
  for (const block of payload.blocks ?? []) {
    const actionIds = (block.elements ?? [])
      .map((element) => element.action_id)
      .filter(Boolean);
    assert.equal(actionIds.length, new Set(actionIds).size);
  }
}

test('Slack command endpoint rejects unsigned requests', async () => {
  const app = createServer({
    env: {
      NODE_ENV: 'test',
      SLACK_SIGNING_SECRET: SIGNING_SECRET,
    },
  });

  const response = await app.inject({
    method: 'POST',
    path: '/slack/commands',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-slack-request-timestamp': String(Math.floor(Date.now() / 1000)),
      'x-slack-signature': 'v0=forged',
    },
    body: slashCommandBody(),
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), { error: 'invalid_signature' });
});

test('Slack command parser separates headcount from budget', () => {
  assert.deepEqual(parseLunchCommandText('for 12 250 by 13:15 veg'), {
    budgetPerPerson: 250,
    deliveryDeadline: '13:15',
    dietaryRules: ['veg_required'],
    headcount: 12,
    officeLocationId: 'office-indiranagar',
  });

  assert.deepEqual(parseLunchCommandText('for 12 ₹250 by 13:15 veg'), {
    budgetPerPerson: 250,
    deliveryDeadline: '13:15',
    dietaryRules: ['veg_required'],
    headcount: 12,
    officeLocationId: 'office-indiranagar',
  });
});

test('Slack slash command creates a native Block Kit lunch run', async () => {
  const app = createServer({
    env: {
      NODE_ENV: 'test',
      SLACK_SIGNING_SECRET: SIGNING_SECRET,
    },
  });

  const response = await signedSlackPost(
    app,
    '/slack/commands',
    slashCommandBody('office koramangala for 6 ₹300 by 13:30 veg'),
  );
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.response_type, 'in_channel');
  assert.match(payload.text, /Swiggy lunch run created/);
  assert.equal(payload.metadata, undefined);
  assert.equal(payload.replace_original, undefined);
  assert.match(JSON.stringify(payload.blocks), /Status: \*Collecting\*/);
  assert.match(JSON.stringify(payload.blocks), /Participants: \*0\/6\*/);
  assert.match(JSON.stringify(payload.blocks), /Budget: \*₹300\/person\*/);
  assert.match(JSON.stringify(payload.blocks), /Next step/);
  assert.match(JSON.stringify(payload.blocks), /Collecting employee choices/);
  assert.ok(
    payload.blocks.some((block) =>
      JSON.stringify(block).includes('"action_id":"choose_item_paneer-bowl"'),
    ),
  );
  assertUniqueActionIds(payload);
});

test('Slack slash command returns usage guidance for help text', async () => {
  const app = createServer({
    env: {
      NODE_ENV: 'test',
      SLACK_SIGNING_SECRET: SIGNING_SECRET,
    },
  });

  const response = await signedSlackPost(
    app,
    '/slack/commands',
    slashCommandBody('help'),
  );
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.response_type, 'ephemeral');
  assert.match(payload.text, /\/swiggy-lunch for 12/);
});

test('Slack slash command accepts bare numeric budget text', async () => {
  const app = createServer({
    env: {
      NODE_ENV: 'test',
      SLACK_SIGNING_SECRET: SIGNING_SECRET,
    },
  });

  const response = await signedSlackPost(
    app,
    '/slack/commands',
    slashCommandBody('for 12 250 by 13:15 veg'),
  );
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.match(JSON.stringify(payload.blocks), /Participants: \*0\/12\*/);
  assert.match(JSON.stringify(payload.blocks), /Budget: \*₹250\/person\*/);
  assertUniqueActionIds(payload);
});

test('Slack interactions can choose, lock, approve, and place an order', async () => {
  const app = createServer({
    env: {
      NODE_ENV: 'test',
      SLACK_SIGNING_SECRET: SIGNING_SECRET,
    },
  });

  const created = await signedSlackPost(app, '/slack/commands', slashCommandBody());
  const createdPayload = JSON.parse(created.body);
  const orderId = extractOrderId(createdPayload);

  const choose = await signedSlackPost(
    app,
    '/slack/interactions',
    interactionBodyWithoutResponseUrl({
      actions: [
        {
          action_id: 'choose_item_paneer-bowl',
          action_ts: '1000.1',
          value: `${orderId}:paneer-bowl`,
        },
      ],
      user: { id: 'UEMP1', username: 'anika' },
    }),
  );
  assert.equal(choose.statusCode, 200);
  assert.match(JSON.parse(choose.body).text, /Anika chose Paneer Millet Bowl/);
  assert.equal(JSON.parse(choose.body).replace_original, true);
  assert.equal(JSON.parse(choose.body).response_type, undefined);

  const lock = await signedSlackPost(
    app,
    '/slack/interactions',
    interactionBodyWithoutResponseUrl({
      actions: [
        {
          action_id: 'lock_cart',
          action_ts: '1000.2',
          value: orderId,
        },
      ],
    }),
  );
  assert.equal(lock.statusCode, 200);
  assert.match(JSON.stringify(JSON.parse(lock.body).blocks), /Status: \*Locked\*/);
  assert.match(JSON.stringify(JSON.parse(lock.body).blocks), /Cart locked/);

  const approve = await signedSlackPost(
    app,
    '/slack/interactions',
    interactionBodyWithoutResponseUrl({
      actions: [
        {
          action_id: 'approve_order',
          action_ts: '1000.3',
          value: orderId,
        },
      ],
    }),
  );
  assert.equal(approve.statusCode, 200);
  assert.match(JSON.stringify(JSON.parse(approve.body).blocks), /Status: \*Approved\*/);
  assert.match(JSON.stringify(JSON.parse(approve.body).blocks), /Final provider placement/);

  const place = await signedSlackPost(
    app,
    '/slack/interactions',
    interactionBodyWithoutResponseUrl({
      actions: [
        {
          action_id: 'place_order',
          action_ts: '1000.4',
          value: orderId,
        },
      ],
    }),
  );
  const placedPayload = JSON.parse(place.body);

  assert.equal(place.statusCode, 200);
  assert.match(JSON.stringify(placedPayload.blocks), /Status: \*Placed\*/);
  assert.match(JSON.stringify(placedPayload.blocks), /Final total/);
  assert.match(placedPayload.text, /Mock Swiggy order placed/);
});

test('Slack interactions update real Slack messages through response_url', async () => {
  const posted = [];
  const app = createServer({
    env: {
      NODE_ENV: 'test',
      SLACK_SIGNING_SECRET: SIGNING_SECRET,
    },
    slackResponsePoster: async (responseUrl, payload) => {
      posted.push({ payload, responseUrl });
    },
  });

  const created = await signedSlackPost(app, '/slack/commands', slashCommandBody());
  const orderId = extractOrderId(JSON.parse(created.body));

  const choose = await signedSlackPost(
    app,
    '/slack/interactions',
    interactionBody({
      actions: [
        {
          action_id: 'choose_item_paneer-bowl',
          action_ts: '3000.1',
          value: `${orderId}:paneer-bowl`,
        },
      ],
      user: { id: 'UEMP1', username: 'anika' },
    }),
  );

  assert.equal(choose.statusCode, 200);
  assert.equal(choose.body, '');
  assert.equal(posted.length, 1);
  assert.equal(posted[0].responseUrl, 'https://hooks.slack.test/response');
  assert.equal(posted[0].payload.replace_original, true);
  assert.match(posted[0].payload.text, /Anika chose Paneer Millet Bowl/);
  assert.match(JSON.stringify(posted[0].payload.blocks), /Participants: \*1\/4\*/);
});

test('Slack interactions block non-organizers from locking a cart', async () => {
  const app = createServer({
    env: {
      NODE_ENV: 'test',
      SLACK_SIGNING_SECRET: SIGNING_SECRET,
    },
  });

  const created = await signedSlackPost(app, '/slack/commands', slashCommandBody());
  const orderId = extractOrderId(JSON.parse(created.body));

  const choose = await signedSlackPost(
    app,
    '/slack/interactions',
    interactionBodyWithoutResponseUrl({
      actions: [
        {
          action_id: 'choose_item_paneer-bowl',
          action_ts: '2000.1',
          value: `${orderId}:paneer-bowl`,
        },
      ],
      user: { id: 'UEMP1', username: 'anika' },
    }),
  );
  assert.equal(choose.statusCode, 200);

  const lock = await signedSlackPost(
    app,
    '/slack/interactions',
    interactionBodyWithoutResponseUrl({
      actions: [
        {
          action_id: 'lock_cart',
          action_ts: '2000.2',
          value: orderId,
        },
      ],
      user: { id: 'UEMP1', username: 'anika' },
    }),
  );

  assert.equal(lock.statusCode, 200);
  assert.deepEqual(JSON.parse(lock.body), {
    response_type: 'ephemeral',
    text: 'Only the organizer can lock, approve, or place this lunch run.',
  });
});
