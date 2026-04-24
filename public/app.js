const sampleEmployees = [
  { id: 'u-anika', name: 'Anika' },
  { id: 'u-dev', name: 'Dev' },
  { id: 'u-meera', name: 'Meera' },
  { id: 'u-rahul', name: 'Rahul' },
  { id: 'u-zoya', name: 'Zoya' },
];

const state = {
  approvalToken: null,
  catalog: null,
  csrfToken: null,
  error: null,
  notice: null,
  order: null,
  selectedEmployeeId: 'u-anika',
  selectedItemId: 'paneer-bowl',
  user: null,
};

const app = document.querySelector('#app');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN')}`;
}

function statusIndex(status) {
  return ['collecting', 'locked', 'approved', 'placed'].indexOf(status);
}

async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
  const headers = {
    accept: 'application/json',
  };

  if (state.csrfToken) {
    headers['x-demo-csrf'] = state.csrfToken;
  }
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  if (idempotencyKey) {
    headers['idempotency-key'] = idempotencyKey;
  }

  const response = await fetch(path, {
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    headers,
    method,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? 'request_failed');
  }

  return payload;
}

function setNotice(message) {
  state.notice = message;
  render();
  window.setTimeout(() => {
    if (state.notice === message) {
      state.notice = null;
      render();
    }
  }, 2600);
}

function setError(error) {
  state.error = error.message ?? String(error);
  render();
}

async function createOrder(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    const payload = await request('/api/orders', {
      body: {
        budgetPerPerson: Number(form.get('budgetPerPerson')),
        deliveryDeadline: form.get('deliveryDeadline'),
        dietaryRules: form.get('vegRequired') === 'on' ? ['veg_required'] : [],
        headcount: Number(form.get('headcount')),
        officeLocationId: form.get('officeLocationId'),
      },
      method: 'POST',
    });
    state.error = null;
    state.approvalToken = null;
    state.order = payload.order;
    setNotice('Order session created');
  } catch (error) {
    setError(error);
  }
}

async function addChoice(event) {
  event.preventDefault();
  const employee = sampleEmployees.find((item) => item.id === state.selectedEmployeeId);

  try {
    const payload = await request(`/api/orders/${state.order.id}/choices`, {
      body: {
        itemId: state.selectedItemId,
        participantId: employee.id,
        participantName: employee.name,
      },
      idempotencyKey: `choice-${employee.id}-${crypto.randomUUID()}`,
      method: 'POST',
    });
    state.error = null;
    state.order = payload.order;
    setNotice(`${employee.name} added`);
  } catch (error) {
    setError(error);
  }
}

async function lockCart() {
  try {
    const payload = await request(`/api/orders/${state.order.id}/lock`, {
      body: {},
      method: 'POST',
    });
    state.error = null;
    state.order = payload.order;
    setNotice('Cart locked');
  } catch (error) {
    setError(error);
  }
}

async function approveOrder() {
  try {
    const payload = await request(`/api/orders/${state.order.id}/approve`, {
      body: {},
      method: 'POST',
    });
    state.error = null;
    state.approvalToken = payload.approvalToken;
    state.order = payload.order;
    setNotice('Approval granted');
  } catch (error) {
    setError(error);
  }
}

async function placeOrder() {
  try {
    const payload = await request(`/api/orders/${state.order.id}/place`, {
      body: { approvalToken: state.approvalToken },
      idempotencyKey: `place-${state.order.id}`,
      method: 'POST',
    });
    state.error = null;
    state.order = payload.order;
    setNotice('Mock Swiggy order placed');
  } catch (error) {
    setError(error);
  }
}

function renderCreatePanel() {
  const locations = state.catalog.officeLocations
    .map(
      (location) =>
        `<option value="${escapeHtml(location.id)}">${escapeHtml(location.name)}</option>`,
    )
    .join('');

  return `
    <section class="panel">
      <h2>New lunch run</h2>
      <form id="create-order-form" class="form-grid">
        <label>
          Office
          <select name="officeLocationId">${locations}</select>
        </label>
        <div class="form-grid two-col">
          <label>
            Budget
            <input name="budgetPerPerson" type="number" min="50" max="5000" value="250">
          </label>
          <label>
            Headcount
            <input name="headcount" type="number" min="1" max="100" value="5">
          </label>
        </div>
        <label>
          Delivery deadline
          <input name="deliveryDeadline" type="time" value="13:15">
        </label>
        <label>
          <span>Dietary rule</span>
          <select name="vegRequired">
            <option value="on">Veg required</option>
            <option value="off">Mixed menu allowed</option>
          </select>
        </label>
        <button class="btn btn-primary" type="submit">Create order</button>
      </form>
    </section>
  `;
}

function renderStatus() {
  if (!state.order) {
    return '';
  }

  const steps = [
    ['Collecting', 'Employee choices'],
    ['Locked', 'Cart frozen'],
    ['Approved', 'Organizer confirmed'],
    ['Placed', 'Mock provider order'],
  ];
  const active = statusIndex(state.order.status);

  return `
    <section class="panel">
      <h2>Order state</h2>
      <div class="status-rail">
        ${steps
          .map(
            ([title, label], index) => `
              <div class="step ${index <= active ? 'active' : ''}">
                <strong>${title}</strong>
                <span class="subtle">${label}</span>
              </div>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderMetrics() {
  if (!state.order) {
    return '';
  }

  return `
    <section class="panel">
      <h2>Run summary</h2>
      <div class="metric-grid">
        <div class="metric"><span>Participants</span><strong>${state.order.participants.length}/${state.order.headcount}</strong></div>
        <div class="metric"><span>Subtotal</span><strong>${money(state.order.totals.subtotal)}</strong></div>
        <div class="metric"><span>Total</span><strong>${money(state.order.totals.total)}</strong></div>
        <div class="metric"><span>Status</span><strong>${escapeHtml(state.order.status)}</strong></div>
      </div>
    </section>
  `;
}

function renderRecommendations() {
  if (!state.order) {
    return '';
  }

  return `
    <section class="panel">
      <h2>Restaurant shortlist</h2>
      <div class="restaurant-grid">
        ${state.order.recommendedRestaurants
          .map(
            (restaurant) => `
              <article class="item-card">
                <h3>${escapeHtml(restaurant.name)}</h3>
                <p class="subtle">${escapeHtml(restaurant.cuisine)}</p>
                <div class="tag-row">
                  <span class="tag ok">${restaurant.etaMinutes} min</span>
                  <span class="tag">Reliability ${restaurant.reliabilityScore}</span>
                  <span class="tag">${restaurant.eligibleItemCount} fit</span>
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderChoicePanel() {
  if (!state.order) {
    return '';
  }

  const locked = state.order.status !== 'collecting';
  const employees = sampleEmployees
    .map(
      (employee) =>
        `<option value="${employee.id}" ${employee.id === state.selectedEmployeeId ? 'selected' : ''}>${escapeHtml(employee.name)}</option>`,
    )
    .join('');
  const items = state.catalog.menuItems
    .map((item) => {
      const flag = item.isVeg ? 'Veg' : 'Non-veg';
      return `<option value="${item.id}" ${item.id === state.selectedItemId ? 'selected' : ''}>${escapeHtml(item.name)} · ${money(item.price)} · ${flag}</option>`;
    })
    .join('');

  return `
    <section class="panel">
      <h2>Employee choice</h2>
      <form id="choice-form" class="form-grid">
        <label>
          Employee
          <select id="employee-select" ${locked ? 'disabled' : ''}>${employees}</select>
        </label>
        <label>
          Meal
          <select id="item-select" ${locked ? 'disabled' : ''}>${items}</select>
        </label>
        <button class="btn btn-primary" type="submit" ${locked ? 'disabled' : ''}>Add choice</button>
      </form>
    </section>
  `;
}

function renderMenu() {
  if (!state.order) {
    return '';
  }

  return `
    <section class="panel">
      <h2>Menu</h2>
      <div class="menu-grid">
        ${state.catalog.menuItems
          .map(
            (item) => `
              <article class="item-card ${item.id === state.selectedItemId ? 'selected' : ''}">
                <h3>${escapeHtml(item.name)}</h3>
                <p class="subtle">${escapeHtml(item.tags.join(' · '))}</p>
                <div class="price">${money(item.price)}</div>
                <div class="tag-row">
                  <span class="tag ${item.isVeg ? 'ok' : 'warn'}">${item.isVeg ? 'Veg' : 'Non-veg'}</span>
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderParticipants() {
  if (!state.order) {
    return '';
  }

  if (state.order.participants.length === 0) {
    return `
      <section class="panel">
        <h2>Participants</h2>
        <div class="empty">No choices submitted</div>
      </section>
    `;
  }

  return `
    <section class="panel">
      <h2>Participants</h2>
      <table class="participant-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Meal</th>
            <th>Price</th>
            <th>Rule</th>
          </tr>
        </thead>
        <tbody>
          ${state.order.participants
            .map(
              (participant) => `
                <tr>
                  <td>${escapeHtml(participant.participantName)}</td>
                  <td>${escapeHtml(participant.item.name)}</td>
                  <td>${money(participant.item.price)}</td>
                  <td><span class="tag ${participant.item.isVeg ? 'ok' : 'warn'}">${participant.item.isVeg ? 'Veg' : 'Non-veg'}</span></td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    </section>
  `;
}

function renderPolicy() {
  if (!state.order) {
    return '';
  }

  const violations = state.order.policyViolations;
  if (violations.length === 0) {
    return `<div class="notice ok">Policy clear</div>`;
  }

  return `
    <div class="notice error">
      ${violations
        .map((violation) => `<strong>${escapeHtml(violation.code)}</strong>: ${escapeHtml(violation.message)}`)
        .join('<br>')}
    </div>
  `;
}

function renderActions() {
  if (!state.order) {
    return '';
  }

  const canLock = state.order.status === 'collecting' && state.order.participants.length > 0;
  const canApprove = state.order.status === 'locked' && state.order.policyViolations.length === 0;
  const canPlace = state.order.status === 'approved' && state.approvalToken;

  return `
    <section class="panel">
      <h2>Approval gate</h2>
      <div class="stack">
        ${renderPolicy()}
        <div class="btn-row">
          <button id="lock-cart" class="btn btn-secondary" type="button" ${canLock ? '' : 'disabled'}>Lock cart</button>
          <button id="approve-order" class="btn btn-warn" type="button" ${canApprove ? '' : 'disabled'}>Approve</button>
          <button id="place-order" class="btn btn-success" type="button" ${canPlace ? '' : 'disabled'}>Place mock order</button>
        </div>
        ${
          state.order.providerOrderId
            ? `<div class="notice ok">Provider order ${escapeHtml(state.order.providerOrderId)}</div>`
            : ''
        }
      </div>
    </section>
  `;
}

function renderControls() {
  return `
    <section class="panel">
      <h2>Controls</h2>
      <div class="controls-grid">
        <div class="control-pill"><span>Tenant scope</span><strong>Active</strong></div>
        <div class="control-pill"><span>CSRF</span><strong>Required</strong></div>
        <div class="control-pill"><span>Idempotency</span><strong>Choice + place</strong></div>
        <div class="control-pill"><span>Approval</span><strong>Explicit</strong></div>
      </div>
    </section>
  `;
}

function render() {
  if (!state.catalog || !state.user) {
    return;
  }

  app.innerHTML = `
    <header class="topbar">
      <div>
        <p class="eyebrow">Swiggy Builders Club mock</p>
        <h1>Office lunch console</h1>
        <p class="subtle">Slack-native group ordering workflow</p>
      </div>
      <div class="workspace-chip">
        <span class="subtle">Workspace</span>
        <strong>${escapeHtml(state.user.name)} · ${escapeHtml(state.user.role)}</strong>
      </div>
    </header>

    ${state.error ? `<div class="notice error">${escapeHtml(state.error)}</div>` : ''}

    <div class="dashboard">
      <aside class="stack">
        ${renderCreatePanel()}
        ${renderChoicePanel()}
        ${renderActions()}
        ${renderControls()}
      </aside>
      <section class="stack">
        ${renderStatus()}
        ${renderMetrics()}
        ${renderRecommendations()}
        ${renderMenu()}
        ${renderParticipants()}
      </section>
    </div>

    ${state.notice ? `<div class="toast">${escapeHtml(state.notice)}</div>` : ''}
  `;

  document.querySelector('#create-order-form')?.addEventListener('submit', createOrder);
  document.querySelector('#choice-form')?.addEventListener('submit', addChoice);
  document.querySelector('#employee-select')?.addEventListener('change', (event) => {
    state.selectedEmployeeId = event.currentTarget.value;
  });
  document.querySelector('#item-select')?.addEventListener('change', (event) => {
    state.selectedItemId = event.currentTarget.value;
    render();
  });
  document.querySelector('#lock-cart')?.addEventListener('click', lockCart);
  document.querySelector('#approve-order')?.addEventListener('click', approveOrder);
  document.querySelector('#place-order')?.addEventListener('click', placeOrder);
}

async function init() {
  try {
    const session = await request('/api/session');
    state.csrfToken = session.csrfToken;
    state.user = session.user;
    state.catalog = await request('/api/catalog');
    render();
  } catch (error) {
    app.innerHTML = `<section class="panel"><div class="notice error">${escapeHtml(error.message)}</div></section>`;
  }
}

init();
