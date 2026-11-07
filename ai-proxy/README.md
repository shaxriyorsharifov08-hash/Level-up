# Mentor AI: deploying the free Worker

`worker.mjs` is the small server between LEVEL UP and an AI model. Until it is deployed and its address is pasted into `index.html`, **Mentor AI stays hidden** and the Mentor answers on the device only. Nothing breaks in the meantime.

It costs nothing on Cloudflare's **Workers Free plan**, needs no credit card and no npm, and you do it in the browser. It takes about 15 minutes.

---

## 1. Create the Worker

1. Make a free account at **dash.cloudflare.com/sign-up** (any email). Stay on the **Free** plan.
2. Open **Workers & Pages → Create → Create Worker**. Choose the "Hello World" starter.
3. Name it `levelup-mentor` and press **Deploy**.
4. Press **Edit code**, delete everything in the editor, then paste the whole of `ai-proxy/worker.mjs` from this repository and press **Deploy**.

## 2. Give it its two bindings

1. **Storage & Databases → KV → Create** a namespace called `levelup-mentor-limits`.
2. Open the Worker → **Settings → Bindings → Add**:
   - **Workers AI**, variable name `AI`.
   - **KV namespace**, variable name `LIMITS`, then pick `levelup-mentor-limits`.

## 3. Set its variables

Open **Settings → Variables and Secrets → Add** and choose type *Text* for each (none of them is a secret):

| Name | Value | Needed? |
|---|---|---|
| `FIREBASE_PROJECT_ID` | `level-up-hunter-03` | yes |
| `ALLOWED_ORIGIN` | `https://shaxriyorsharifov08-hash.github.io` | optional, this is the default. Add more addresses separated by commas |
| `DAILY_LIMIT` | `3` | optional |
| `PREMIUM_LIMIT` | `20` | optional |
| `GLOBAL_DAILY_LIMIT` | `200` | optional. Everyone together, per UTC day |
| `MODEL` | `@cf/google/gemma-3-12b-it` | optional |

Press **Deploy** again. Copy the Worker's address, for example `https://levelup-mentor.yourname.workers.dev`.

## 4. Switch it on in the app

In `index.html`, find this line (search for `AI_PROXY_URL`):

```js
var AI_PROXY_URL = "";
```

Put the address between the quotes and commit:

```js
var AI_PROXY_URL = "https://levelup-mentor.yourname.workers.dev";
```

The address is **not a secret**. The page is public and anyone can read it, which is fine: the Worker only answers a real Google sign-in from this app, a few times a day per account. A test (`tests/mentor.spec.js`) fails if anything that looks like a key is ever put in the page.

To check it works: sign in with Google, open **PROGRESS → PROFILE → SYSTEM MENTOR**, press **TURN ON MENTOR AI**, read the window, press YES and ask something.

---

## Day-to-day

- **Make someone Premium:** KV → `levelup-mentor-limits` → **Add entry**: key `premium:<uid>`, value `1` (they get `PREMIUM_LIMIT`), or a number for their own limit. Their uid is in the Firebase console → Authentication → Users → *User UID*. Delete the entry to take it away.
- **See the usage:** the Workers AI page of the dashboard shows the neurons used today.
- **Turn it off quickly:** in the app's admin console set **Mentor AI chat** to removed; or empty `AI_PROXY_URL` again; or press **Disable** on the Worker. The on-device Mentor keeps working in every case.
- **Logs:** the Worker never writes questions to the log. If you switch on Workers Logs in the dashboard, Cloudflare records request details such as time and status, never the question text.

## Agent mode (README 4z)

When the Mentor agent is open in the app, requests carry `"mode":"agent"`. The Worker then adds agent rules to the prompt and asks for a JSON answer: `{"reply": "...", "actions": [...]}`. Before anything leaves the Worker, `cleanActions` keeps only the five allowed kinds (`quest`, `goal`, `todo`, `focus`, `open`), cuts names to 60 characters, clamps numbers (goal steps 1–99, focus 5–120 minutes), allows only the listed pages, drops any action with crisis or diet words, and keeps at most five. Broken or cut-off JSON is answered as "busy" and is not counted. The answer then carries `actions` next to `answer`; the app checks them again and shows them as cards the hero must confirm. Nothing about deployment changes: same bindings, same variables, same limits (an agent request counts as one question). Requests without `mode` work exactly as before.

## What it costs, and what can go wrong

- **Free plan, free forever:** Workers AI includes 10,000 neurons a day, reset at 00:00 UTC. A Mentor question uses roughly 40 to 50 neurons with Gemma 3 12B, so the free allowance covers about 200 questions a day across all heroes, which with 3 each is roughly 65 to 70 active heroes a day. On the Free plan, Cloudflare stops answering when the allowance runs out; it does not bill you. The app then says Mentor AI is busy and answers on the device.
- **KV on the Free plan** allows 1,000 writes a day. Each answered question writes 2 (the hero's counter and the total), so `GLOBAL_DAILY_LIMIT = 200` keeps you inside both limits.
- **If you ever move to the Paid plan** ($5 a month), extra neurons cost $0.011 per 1,000, about $0.0005 a question. Keep `GLOBAL_DAILY_LIMIT` so a busy day cannot surprise you.
- **The limit is close, not exact.** KV can take a moment to agree across Cloudflare's locations, so someone sending many questions at the same instant could get one or two extra. The total cap and the free allowance still hold.
- **The address check alone stops only browsers.** A script can fake the Origin header, which is why the Google sign-in is the real gate. Each Google account gets its own 3 a day, and email/password or anonymous accounts are refused.
- **The model can be wrong,** and it is weaker in Uzbek than in English or Russian. Every AI answer says so. Health, diet and crisis questions never reach it: the app answers them on the device, and the Worker refuses them too.

Sources: Cloudflare Workers AI pricing and free allocation (developers.cloudflare.com/workers-ai/platform/pricing), KV limits (developers.cloudflare.com/kv/platform/limits), Workers AI privacy: Cloudflare does not use prompts or outputs to train models (developers.cloudflare.com/workers-ai/platform/privacy).

Tests: `tests/ai-proxy.spec.js` runs this file in Node with a fake model, a fake KV and a test signing key, so every gate above is checked on every push without touching Cloudflare.
