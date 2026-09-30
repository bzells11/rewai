# REW AI public demo

Live link: **https://rewai-demo.vercel.app**

A reviewer opens the link and lands straight on the pipeline. No login, no real
texts, and nothing written to the real database.

## What a reviewer does

The pipeline header has a three-step strip:

1. **Load sample leads** puts 25 fake owners in the Cold column.
2. **Send campaign** simulates the intro text to all 25 and moves them to Active.
3. **Simulate replies** streams 20 owner replies in over about 30 seconds. Each
   lead moves to Hot, Warm, Not Interested or Do Not Contact with a one-line
   reason on the card.

The whole run takes under a minute. Conversations shows the full text threads.
**Reset demo** in the banner clears everything for the next visitor.

## How it is wired

- Each visitor gets a sandbox held in the backend's memory, keyed by a random id
  the browser stores in `localStorage` and sends as `X-Demo-Session`.
- Sandboxes never touch Supabase. They expire after 60 minutes of inactivity.
- `/demo/*` mirrors the shapes of `/leads` and `/users/me`, so the normal pages
  run unchanged against it.
- Classification is scripted, not a model call. Every reply in
  `backend/demo/sample_replies.csv` carries its own category and reason.
  `backend/src/services/claude.js` is still the swap point if you later want a
  real model to do this.
- An opt-out keyword forces Do Not Contact regardless of the scripted category,
  so the compliance path is always the one shown.

## Sample data

| File | Contents |
| --- | --- |
| `backend/demo/sample_leads.csv` | 25 owners, made-up Columbus addresses, 555-01xx numbers |
| `backend/demo/sample_replies.csv` | 20 replies: interested, curious, not interested, angry, opt-out |

Phone numbers all sit in the 555-0100 range, which is reserved for fiction and
cannot be dialed. The Import page also offers this CSV with one click.

## Environment

Railway (backend, project `robust-bravery`):

| Variable | Value | Effect |
| --- | --- | --- |
| `DEMO_ROUTES` | `true` | Mounts `/demo` only. Real texting still works. |
| `DEMO_MODE` | unset | Set to `true` to also stub every Twilio send and pause the follow-up cron. |
| `DEMO_MAX_ACTIONS_PER_HOUR` | `40` | Per-visitor cap on load, send, replies and writes. |
| `DEMO_MAX_ACTIONS_PER_DAY` | `5000` | Global daily cap. |
| `DEMO_SESSION_TTL_MINUTES` | `60` | Idle sandbox lifetime. |
| `DEMO_MAX_SESSIONS` | `500` | Oldest sandbox is evicted past this. |

Vercel (frontend, project `rewai-demo`):

| Variable | Value |
| --- | --- |
| `VITE_DEMO_MODE` | `true` |
| `VITE_API_URL` | the Railway backend URL |

No Supabase keys are set on the demo project, so none reach the browser.

## Redeploying

`frontend/.vercel` is linked to `rewai-demo`, so from `frontend/`:

```
vercel --prod          # deploys the demo
```

To deploy the original app instead, relink first:

```
vercel link --yes --project frontend
```

Backend, from `backend/`:

```
railway up
```

## Safety notes

- Every secret stays on Railway. The browser bundle carries no keys.
- Requests are capped per IP per minute, per visitor per hour, and globally per day.
- The admin panel is unreachable: the demo profile is not an admin.
- CORS allows only localhost and the two Vercel project hostnames.
