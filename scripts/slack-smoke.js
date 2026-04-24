import { createHmac } from 'node:crypto';

const baseUrl = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:4173';
const signingSecret = process.env.SLACK_SIGNING_SECRET;

if (!signingSecret) {
  console.error('SLACK_SIGNING_SECRET is required for the signed Slack smoke test.');
  process.exit(1);
}

function signBody(body) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = `v0=${createHmac('sha256', signingSecret)
    .update(`v0:${timestamp}:${body}`)
    .digest('hex')}`;

  return {
    'content-type': 'application/x-www-form-urlencoded',
    'x-slack-request-timestamp': timestamp,
    'x-slack-signature': signature,
  };
}

async function postSlack(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    body,
    headers: signBody(body),
    method: 'POST',
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function slashBody(text) {
  return new URLSearchParams({
    channel_id: 'CLOCAL',
    channel_name: 'team-lunch',
    command: '/swiggy-lunch',
    team_domain: 'local-demo',
    team_id: 'TLOCAL',
    text,
    trigger_id: `trigger-${Date.now()}`,
    user_id: 'UORG',
    user_name: 'organizer',
  }).toString();
}

function interactionBody({ actionId, actionTs, orderId, itemId, userId, userName }) {
  return new URLSearchParams({
    payload: JSON.stringify({
      actions: [
        {
          action_id: actionId,
          action_ts: actionTs,
          value: itemId ? `${orderId}:${itemId}` : orderId,
        },
      ],
      channel: { id: 'CLOCAL' },
      team: { id: 'TLOCAL' },
      trigger_id: `trigger-${Date.now()}`,
      type: 'block_actions',
      user: { id: userId, username: userName },
    }),
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
  if (!action) {
    throw new Error('No order action found in Slack response payload.');
  }
  return action.value.split(':')[0];
}

function statusFromPayload(payload) {
  const text = JSON.stringify(payload.blocks ?? []);
  return text.match(/Status: \*([^*]+)\*/)?.[1] ?? 'Unknown';
}

function providerOrderFromPayload(payload) {
  const text = JSON.stringify(payload.blocks ?? []);
  return text.match(/Provider order:\* ([A-Z0-9-]+)/)?.[1] ?? null;
}

function logStep(step, payload) {
  console.log(`${step}: ${payload.text} (${statusFromPayload(payload)})`);
}

const created = await postSlack(
  '/slack/commands',
  slashBody('office indiranagar for 4 ₹250 by 13:15 veg'),
);
const orderId = extractOrderId(created);
logStep('1. Created lunch run', created);

const anikaChoice = await postSlack(
  '/slack/interactions',
  interactionBody({
    actionId: 'choose_item_paneer-bowl',
    actionTs: '1.1',
    itemId: 'paneer-bowl',
    orderId,
    userId: 'UEMP1',
    userName: 'anika',
  }),
);
logStep('2. Anika chose a meal', anikaChoice);

const devChoice = await postSlack(
  '/slack/interactions',
  interactionBody({
    actionId: 'choose_item_veg-thali',
    actionTs: '1.2',
    itemId: 'veg-thali',
    orderId,
    userId: 'UEMP2',
    userName: 'dev',
  }),
);
logStep('3. Dev chose a meal', devChoice);

const lock = await postSlack(
  '/slack/interactions',
  interactionBody({
    actionId: 'lock_cart',
    actionTs: '1.3',
    orderId,
    userId: 'UORG',
    userName: 'organizer',
  }),
);
logStep('4. Organizer locked cart', lock);

const approve = await postSlack(
  '/slack/interactions',
  interactionBody({
    actionId: 'approve_order',
    actionTs: '1.4',
    orderId,
    userId: 'UORG',
    userName: 'organizer',
  }),
);
logStep('5. Organizer approved order', approve);

const placed = await postSlack(
  '/slack/interactions',
  interactionBody({
    actionId: 'place_order',
    actionTs: '1.5',
    orderId,
    userId: 'UORG',
    userName: 'organizer',
  }),
);
logStep('6. Mock Swiggy order placed', placed);

console.log(`Order id: ${orderId}`);
console.log(`Provider order id: ${providerOrderFromPayload(placed) ?? 'not returned'}`);
