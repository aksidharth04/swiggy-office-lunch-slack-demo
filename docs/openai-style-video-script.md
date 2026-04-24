# OpenAI-Style Product Demo Script

Use this as the recording and narration spine for Screen Studio.

## Direction

The video should feel calm, precise, and product-led. Avoid hype language, fast cuts, loud music, oversized captions, or decorative transitions. The product interaction should carry the story.

Visual principles:

- Mostly real UI, not a long slide deck.
- Minimal title cards with large neutral typography.
- Cursor movement should be slow enough to read, but edited tightly.
- Zooms should clarify one action at a time.
- Keep Slack messages readable; do not over-zoom buttons.
- Use no background music, or a very low ambient bed.
- Prefer a human voiceover with short sentences and pauses.

## Final Video Structure

Target duration: 90 to 120 seconds.

```text
00:00 Title card
00:07 Problem setup
00:18 Architecture card
00:28 Live Slack command
00:45 Meal choices
01:03 Organizer approval
01:22 Mock order placement
01:38 Closing card
```

## Shot 1: Title Card

Visual:

Open `docs/demo-slides.html` and show slide 1.

Voiceover:

```text
This is Swiggy Office Lunch, a Slack-native prototype for coordinating team meals.
```

Screen Studio:

- Capture browser window.
- No cursor visible on the first title card.
- Hold for 5 to 7 seconds.

## Shot 2: Problem Setup

Visual:

Move to slide 2.

Voiceover:

```text
Office lunch usually happens across messages, late replies, and manual approval. The prototype turns that into one structured workflow inside Slack.
```

Screen Studio:

- Use a gentle zoom on the four problem lines.
- Keep the movement linear and slow.

## Shot 3: Architecture

Visual:

Move to slide 3.

Voiceover:

```text
For review, Slack sends signed requests through ngrok to the local Node backend. The backend verifies the request, renders Slack blocks, and keeps the Swiggy adapter in mock mode.
```

Screen Studio:

- Add one zoom from left to right across the flow.
- Do not add extra annotations.

## Shot 4: Live Slash Command

Visual:

Switch to Slack. Run:

```text
/swiggy-lunch office koramangala for 6 INR 300 by 13:30 mixed
```

Voiceover:

```text
The organizer starts with a slash command: office, headcount, budget, deadline, and dietary preference.
```

Screen Studio:

- Start recording before pressing Enter.
- Zoom only after Slack renders the response.
- Hold on the created lunch run long enough to read the budget and deadline.

## Shot 5: Participant Choices

Visual:

Choose one meal. If possible, show a second participant choice from another Slack user or test account.

Voiceover:

```text
Participants choose meals directly from the Slack message. The shared state updates in the same place where the team is already coordinating.
```

Screen Studio:

- Keep cursor movement deliberate.
- Cut out Slack loading pauses.
- Keep the updated message visible after each interaction.

## Shot 6: Organizer Controls

Visual:

Click lock, then approve.

Voiceover:

```text
Organizer-only actions protect the final steps. The cart can be locked, reviewed, and approved before placement.
```

Screen Studio:

- Add a mild zoom on the organizer controls.
- Do not over-explain every button.

## Shot 7: Mock Placement

Visual:

Click place order and pause on the final provider order id.

Voiceover:

```text
Placement returns a mock provider order id. The live Swiggy adapter boundary is present, but disabled until real provider access is available.
```

Screen Studio:

- Pause on the final success state for 4 to 5 seconds.
- This is the proof frame.

## Shot 8: Close

Visual:

Return to slide 6.

Voiceover:

```text
The result is a reviewable Slack workflow: signed requests, structured choices, approval controls, and a clean path to a live provider integration.
```

Screen Studio:

- Hold the final card.
- Fade out; avoid a flashy end transition.

## Edit Notes

- Remove dead time instead of speeding footage aggressively.
- Use 1.1x to 1.2x speed only for long waits.
- Prefer hard cuts or simple dissolves.
- Keep captions small and sentence-cased if used.
- Use captions for important commands and URLs only.
- Export 16:9 MP4, 1080p minimum.

