# Real Slack + ngrok Demo Recording Runbook

Use this when recording the Swiggy Office Lunch prototype in Screen Studio.

For an OpenAI-style final cut, use the companion script:

- `docs/openai-style-video-script.md`

## Goal

Record a short product demo that combines:

- The informational deck in `docs/demo-slides.html`
- A real Slack workspace install
- A local Node backend exposed through ngrok
- The actual `/slack/commands` and `/slack/interactions` endpoints

## 1. Start the backend

Use the real Slack signing secret from the Slack app settings.

```bash
export SLACK_SIGNING_SECRET="your-real-slack-signing-secret"
npm start
```

Check health:

```bash
curl http://127.0.0.1:4173/api/health
```

The response should show Slack signing readiness as configured.

## 2. Start ngrok

In a second terminal:

```bash
ngrok http 4173
```

Copy the HTTPS forwarding URL, for example:

```text
https://clear-lunch-demo.ngrok-free.app
```

## 3. Update Slack app settings

In the Slack app configuration:

```text
Slash command URL:
https://YOUR-NGROK.ngrok-free.app/slack/commands

Interactivity request URL:
https://YOUR-NGROK.ngrok-free.app/slack/interactions
```

Reinstall or update the app in the workspace after changing URLs.

## 4. Rehearse the Slack flow

In the target Slack channel:

```text
/swiggy-lunch office koramangala for 6 INR 300 by 13:30 mixed
```

Demo beats:

1. Run the command and pause on the created lunch run.
2. Choose a meal as a participant.
3. Add a second participant choice if useful.
4. Lock the cart as the organizer.
5. Approve the order.
6. Place the mock Swiggy order.
7. Pause on the provider order id and final status.

## 5. Screen Studio capture settings

Recommended recording approach:

- Record the browser window for `docs/demo-slides.html` first.
- Record the Slack window second.
- Use 16:9, 1080p or 4K depending on the target upload.
- Enable smooth cursor and use manual zooms sparingly.
- Keep zoom strength modest so Slack blocks remain readable.
- Disable webcam for the cleaner OpenAI-style cut.
- Use a clean human voiceover instead of live talking while clicking.
- Record system audio only if Slack notifications are part of the story.
- Keep transitions simple: hard cuts or short dissolves.

Suggested edit structure:

```text
00:00 deck title and problem
00:20 architecture slide showing Slack -> ngrok -> backend
00:35 switch to Slack
00:45 slash command creates the lunch run
01:05 participant choices
01:25 organizer lock and approval
01:45 mock placement and final order id
02:00 closing slide
```

## 6. OpenAI-style editing rules

Use this style direction:

- Lead with product behavior, not branding.
- Keep the deck to short title cards and architecture context.
- Let the Slack workflow occupy most of the runtime.
- Use calm narration with short sentences.
- Avoid hype phrases, loud music, heavy motion, and decorative overlays.
- Pause on proof frames: signed command response, approval state, final order id.
- Keep every on-screen command readable for at least two seconds.

## 7. Production note

For a permanent Slack install, replace ngrok with a stable HTTPS backend URL from Render, Fly, Railway, Cloudflare, or another Node-capable host. Keep `SWIGGY_ADAPTER_MODE=mock` until real Swiggy provider credentials and API terms are available.
