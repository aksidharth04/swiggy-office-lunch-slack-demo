import { verifySlackSignature } from './security.js';

const DEFAULT_ORDER = {
  budgetPerPerson: 250,
  deliveryDeadline: '13:15',
  dietaryRules: ['veg_required'],
  headcount: 4,
  officeLocationId: 'office-indiranagar',
};
const USAGE_TEXT =
  'Try `/swiggy-lunch for 12 ₹250 by 13:15 veg` or `/swiggy-lunch office koramangala for 6 ₹300 by 13:30 mixed`.';
const STATE_GUIDANCE = {
  approved: 'Approved. Final provider placement still needs one organizer click.',
  collecting: 'Collecting employee choices. Participants can choose meals; organizer can lock when ready.',
  locked: 'Cart locked. Choices are frozen and organizer approval is next.',
  placed: 'Placed with the provider. Share the provider id with the office admin if needed.',
};

function titleCase(value) {
  return String(value ?? '')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function money(value) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN')}`;
}

function markdownText(text) {
  return {
    text,
    type: 'mrkdwn',
  };
}

function plainText(text) {
  return {
    emoji: true,
    text,
    type: 'plain_text',
  };
}

function button({ actionId, style, text, value }) {
  return {
    action_id: actionId,
    text: plainText(text),
    type: 'button',
    value,
    ...(style ? { style } : {}),
  };
}

function parseTime(text) {
  const match = text.match(/\b(?:by|before|at)?\s*([01]?\d|2[0-3]):([0-5]\d)\b/i);
  if (!match) {
    return DEFAULT_ORDER.deliveryDeadline;
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function parseLunchCommandText(text = '') {
  const normalized = text.toLowerCase();
  const headcountMatch = normalized.match(/\b(?:for|headcount|people|team)\s+(\d{1,3})\b/i);
  const budgetMatch = normalized.match(
    /\b(?:budget(?:\s+of)?|₹|rs\.?|inr)\s*(\d{2,5})\b|\b(\d{2,5})\s*(?:\/head|per person|pp)\b/i,
  );
  const officeLocationId = normalized.includes('koramangala')
    ? 'office-koramangala'
    : DEFAULT_ORDER.officeLocationId;
  const mixedMenu =
    normalized.includes('mixed') ||
    normalized.includes('non veg allowed') ||
    normalized.includes('non-veg allowed');
  const timeMatch = normalized.match(/\b(?:by|before|at)?\s*([01]?\d|2[0-3]):([0-5]\d)\b/i);

  let budgetPerPerson = budgetMatch
    ? Number(budgetMatch[1] || budgetMatch[2])
    : DEFAULT_ORDER.budgetPerPerson;

  if (!budgetMatch) {
    let fallbackSource = normalized;
    if (headcountMatch) {
      fallbackSource = fallbackSource.replace(headcountMatch[0], ' ');
    }
    if (timeMatch) {
      fallbackSource = fallbackSource.replace(timeMatch[0], ' ');
    }

    const fallbackBudget = [...fallbackSource.matchAll(/\b(\d{2,5})\b/g)]
      .map((match) => Number(match[1]))
      .find((value) => value >= 50);

    if (fallbackBudget) {
      budgetPerPerson = fallbackBudget;
    }
  }

  return {
    budgetPerPerson,
    deliveryDeadline: parseTime(normalized),
    dietaryRules: mixedMenu ? [] : DEFAULT_ORDER.dietaryRules,
    headcount: headcountMatch ? Number(headcountMatch[1]) : DEFAULT_ORDER.headcount,
    officeLocationId,
  };
}

export function tenantIdFromSlack(teamId) {
  return `slack:${teamId}`;
}

export function userIdFromSlack(userId) {
  return `slack:${userId}`;
}

function selectedMealText(order) {
  if (order.participants.length === 0) {
    return 'No choices submitted yet.';
  }

  return order.participants
    .map(
      (participant) =>
        `• ${participant.participantName}: ${participant.item.name} (${money(
          participant.item.price,
        )})`,
    )
    .join('\n');
}

function policyText(order) {
  if (order.policyViolations.length === 0) {
    return 'Policy clear: budget, dietary rule, and approval gate are satisfied.';
  }

  return order.policyViolations
    .map((violation) => `• *${violation.code}*: ${violation.message}`)
    .join('\n');
}

function restaurantText(order) {
  return order.recommendedRestaurants
    .map(
      (restaurant) =>
        `• *${restaurant.name}* - ${restaurant.cuisine}, ${restaurant.etaMinutes} min, reliability ${restaurant.reliabilityScore}`,
    )
    .join('\n');
}

function choiceButtons(order) {
  const seenItemNames = new Set();
  const availableItemIds = new Set((order.availableMenuItems ?? []).map((item) => item.id));

  const preferredItems = [
    ['paneer-bowl', 'Paneer bowl'],
    ['veg-thali', 'Veg thali'],
    ['idli-combo', 'Idli combo'],
    ['protein-salad', 'Protein salad'],
    ['butter-chicken-combo', 'Chicken combo'],
  ];

  return preferredItems
    .filter(([itemId, label]) => {
      if (seenItemNames.has(label)) {
        return false;
      }
      seenItemNames.add(label);
      return availableItemIds.size === 0 || availableItemIds.has(itemId);
    })
    .slice(0, 5)
    .map(([itemId, label]) =>
      button({
        actionId: `choose_item_${itemId}`,
        text: label,
        value: `${order.id}:${itemId}`,
      }),
    );
}

function nextStepText(order) {
  if (order.policyViolations.length > 0 && order.status === 'locked') {
    return 'Resolve policy issues before approval.';
  }
  return STATE_GUIDANCE[order.status] ?? 'Review the lunch run.';
}

function actionButtons(order) {
  if (order.status === 'collecting') {
    return [
      button({
        actionId: 'lock_cart',
        style: 'primary',
        text: 'Lock cart',
        value: order.id,
      }),
    ];
  }

  if (order.status === 'locked' && order.policyViolations.length === 0) {
    return [
      button({
        actionId: 'approve_order',
        style: 'primary',
        text: 'Approve order',
        value: order.id,
      }),
    ];
  }

  if (order.status === 'approved') {
    return [
      button({
        actionId: 'place_order',
        style: 'danger',
        text: 'Place mock order',
        value: order.id,
      }),
    ];
  }

  return [];
}

export function renderSlackOrderMessage(
  order,
  { replaceOriginal = false, textPrefix = 'Swiggy lunch run' } = {},
) {
  const blocks = [
    {
      text: plainText('Swiggy Office Lunch'),
      type: 'header',
    },
    {
      text: markdownText(
        `*${textPrefix}*\nStatus: *${titleCase(order.status)}* | Budget: *${money(
          order.budgetPerPerson,
        )}/person* | Deadline: *${order.deliveryDeadline}* | Participants: *${order.participants.length}/${order.headcount}* | Provider: *${order.provider}*`,
      ),
      type: 'section',
    },
    {
      text: markdownText(`*Next step*\n${nextStepText(order)}`),
      type: 'section',
    },
    {
      text: markdownText(`*Recommended restaurants*\n${restaurantText(order)}`),
      type: 'section',
    },
    {
      text: markdownText(`*Submitted choices*\n${selectedMealText(order)}`),
      type: 'section',
    },
    {
      text: markdownText(`*Policy check*\n${policyText(order)}`),
      type: 'section',
    },
  ];

  if (order.status === 'collecting') {
    blocks.push({
      elements: choiceButtons(order),
      type: 'actions',
    });
  }

  const actions = actionButtons(order);
  if (actions.length > 0) {
    blocks.push({
      elements: actions,
      type: 'actions',
    });
  }

  if (order.providerOrderId) {
    blocks.push({
      text: markdownText(`*Provider order:* ${order.providerOrderId}`),
      type: 'section',
    });
  }

  if (order.status === 'placed') {
    blocks.push({
      text: markdownText(
        `*Final total:* ${money(order.totals.total)} (${money(
          order.totals.subtotal,
        )} food + ${money(order.totals.platformFee + order.totals.deliveryFee)} fees)`,
      ),
      type: 'section',
    });
  }

  const response = {
    blocks,
    text: textPrefix,
  };

  if (replaceOriginal) {
    response.replace_original = true;
  }

  return response;
}

function slashCommandResponse(order, options) {
  return {
    ...renderSlackOrderMessage(order, options),
    response_type: 'in_channel',
  };
}

function usageResponse(text = USAGE_TEXT) {
  return {
    response_type: 'ephemeral',
    text,
  };
}

export function verifySlackRequest({ body, env, headers }) {
  const signingSecret = env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return { ok: false, response: { error: 'slack_signing_secret_required' }, statusCode: 500 };
  }

  const result = verifySlackSignature({
    body,
    signature: headers['x-slack-signature'],
    signingSecret,
    timestamp: headers['x-slack-request-timestamp'],
  });

  if (!result.ok) {
    return { ok: false, response: { error: result.reason }, statusCode: 401 };
  }

  return { ok: true };
}

export function parseSlackForm(body) {
  return Object.fromEntries(new URLSearchParams(body));
}

function slackActor(payload) {
  return {
    actorId: userIdFromSlack(payload.user.id),
    actorName: titleCase(payload.user.username || payload.user.name || payload.user.id),
    actorRole: 'organizer',
    tenantId: tenantIdFromSlack(payload.team.id),
  };
}

function slackErrorResponse(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'forbidden') {
    return usageResponse('Only the organizer can lock, approve, or place this lunch run.');
  }
  if (message === 'order_not_collecting') {
    return usageResponse('This lunch run is no longer collecting choices.');
  }
  if (message === 'order_not_locked') {
    return usageResponse('Lock the cart before approving the order.');
  }
  if (message === 'order_not_approved') {
    return usageResponse('Approve the order before placing it with the provider.');
  }
  if (message.startsWith('policy_violation')) {
    return usageResponse('Approval is blocked by policy. Review the policy check in the lunch run.');
  }
  if (message.startsWith('swiggy_not_configured')) {
    return usageResponse('Live Swiggy mode is missing provider configuration. Use mock mode for the pitch demo.');
  }
  if (message === 'swiggy_live_adapter_not_implemented') {
    return usageResponse('Live Swiggy placement is not implemented yet. Use mock mode for the pitch demo.');
  }
  throw error;
}

function actionIdempotencyKey(payload, action) {
  return [
    payload.team.id,
    payload.user.id,
    action.action_id,
    action.value,
    action.action_ts || payload.trigger_id,
  ].join(':');
}

async function defaultPostSlackResponse(responseUrl, payload) {
  const response = await fetch(responseUrl, {
    body: JSON.stringify(payload),
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`slack_response_url_failed_${response.status}`);
  }
}

async function interactionUpdate(payload, message, postSlackResponse) {
  if (!payload.response_url) {
    return message;
  }

  await postSlackResponse(payload.response_url, message);
  return null;
}

export function createSlackIntegration({
  postSlackResponse = defaultPostSlackResponse,
  services,
}) {
  const approvalTokens = new Map();

  return {
    handleSlashCommand(form) {
      if (form.command !== '/swiggy-lunch') {
        return usageResponse('Unsupported command. Use `/swiggy-lunch` for office lunch runs.');
      }

      const text = String(form.text ?? '').trim();
      if (/^(help|usage|\?)$/i.test(text)) {
        return usageResponse(USAGE_TEXT);
      }

      const order = services.orders.createOrderSession({
        ...parseLunchCommandText(text),
        organizerId: userIdFromSlack(form.user_id),
        organizerRole: 'organizer',
        tenantId: tenantIdFromSlack(form.team_id),
      });

      return slashCommandResponse(order, {
        textPrefix: 'Swiggy lunch run created',
      });
    },

    async handleInteraction(form) {
      const payload = JSON.parse(form.payload);
      const action = payload.actions?.[0];
      if (!action) {
        return {
          response_type: 'ephemeral',
          text: 'No Slack action found.',
        };
      }

      const actor = slackActor(payload);
      const idempotencyKey = actionIdempotencyKey(payload, action);

      try {
        if (action.action_id.startsWith('choose_item')) {
          const [orderId, itemId] = action.value.split(':');
          const order = services.orders.submitParticipantChoice({
            idempotencyKey,
            itemId,
            orderId,
            participantId: actor.actorId,
            participantName: actor.actorName,
            tenantId: actor.tenantId,
          });
          const chosen = order.participants.find(
            (participant) => participant.participantId === actor.actorId,
          );

          return interactionUpdate(
            payload,
            renderSlackOrderMessage(order, {
              replaceOriginal: true,
              textPrefix: `${actor.actorName} chose ${chosen.item.name}`,
            }),
            postSlackResponse,
          );
        }

        if (action.action_id === 'lock_cart') {
          const order = services.orders.lockCart({
            actorId: actor.actorId,
            actorRole: actor.actorRole,
            orderId: action.value,
            tenantId: actor.tenantId,
          });
          return interactionUpdate(
            payload,
            renderSlackOrderMessage(order, {
              replaceOriginal: true,
              textPrefix: 'Cart locked for approval',
            }),
            postSlackResponse,
          );
        }

        if (action.action_id === 'approve_order') {
          const result = services.orders.approveOrder({
            actorId: actor.actorId,
            actorRole: actor.actorRole,
            orderId: action.value,
            tenantId: actor.tenantId,
          });
          approvalTokens.set(
            `${actor.tenantId}:${action.value}:${actor.actorId}`,
            result.approvalToken,
          );
          return interactionUpdate(
            payload,
            renderSlackOrderMessage(result.order, {
              replaceOriginal: true,
              textPrefix: 'Order approved; final placement still needs one click',
            }),
            postSlackResponse,
          );
        }

        if (action.action_id === 'place_order') {
          const approvalToken = approvalTokens.get(
            `${actor.tenantId}:${action.value}:${actor.actorId}`,
          );
          const order = services.orders.placeOrder({
            actorId: actor.actorId,
            actorRole: actor.actorRole,
            approvalToken,
            idempotencyKey,
            orderId: action.value,
            tenantId: actor.tenantId,
          });
          return interactionUpdate(
            payload,
            renderSlackOrderMessage(order, {
              replaceOriginal: true,
              textPrefix: 'Mock Swiggy order placed',
            }),
            postSlackResponse,
          );
        }
      } catch (error) {
        return slackErrorResponse(error);
      }

      return {
        response_type: 'ephemeral',
        text: `Unsupported action: ${action.action_id}`,
      };
    },
  };
}
