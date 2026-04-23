# Testing the Valhalla AI chat (`zoracore.dk`) — Dify SSE proxy

Applies whenever you touch `frontend/src/app/chat/**`, `frontend/src/components/chat/**`, `frontend/src/app/api/chat/**`, or the root page `frontend/src/app/page.tsx` (which aliases to the chat).

The app was renamed from **Zoracore** → **Valhalla AI** in PR #105. All user-facing strings use Valhalla AI; internal code paths still say `zoracore-chat-proxy` for the API health response.

## Devin Secrets Needed

- `DIFY_API_KEY_ZORACORE_CHAT` — repo-scoped. The Dify App API key (starts with `app-`) the proxy forwards to. Written to `frontend/.env.local` as `DIFY_API_KEY` for local `next dev`, and set on the `zora-core` + `ai` Vercel projects (Prod/Preview/Dev). **Precondition:** the Dify app behind this key must have an LLM model bound; otherwise every request returns `400 {"message":"Model is not configured"}`.
- `VERCEL_TOKEN` — org-scoped. Used for `vercel inspect <url> --logs` on failed builds, and for the T8 "ship bundle to Vercel" assertion.

## Where to run the tests

### Phase 0–3 functional tests against prod

**`https://zoracore.dk/` is the canonical prod surface. Test there directly whenever possible** — no SSO gate on the custom domain. The `/chat` route is aliased to `/`.

### Local (only if testing a branch not yet deployed)

**Do not try to test against the Vercel preview URL.** The `zora-core` team has `ssoProtection: all_except_custom_domains`, which blocks headless access to `*.vercel.app`. Run locally:

```bash
cd /home/ubuntu/repos/ZORA-CORE/frontend
npm install --legacy-peer-deps   # .npmrc already sets this
echo "DIFY_API_KEY=$DIFY_API_KEY_ZORACORE_CHAT" > .env.local
npm run dev -- -p 3000
```

Then test at `http://localhost:3000/`.

## Pre-test sanity check (1 minute, no GUI)

```bash
# 1. Dify directly
curl -sS -X POST https://api.dify.ai/v1/chat-messages \
  -H "Authorization: Bearer $DIFY_API_KEY_ZORACORE_CHAT" \
  -H "Content-Type: application/json" \
  -d '{"inputs":{},"query":"hi","response_mode":"blocking","user":"probe"}'
# Expect: 200 with {"answer":"...","conversation_id":"..."}
# 400 {"message":"Model is not configured"} → STOP, escalate. The Dify app needs a model bound.
# 504 from Cloudflare → transient Dify outage; wait ~2 minutes and retry. Test against prod instead; Dify
#      sometimes recovers faster when hit via the real edge.

# 2. Proxy end-to-end (if running locally)
curl -sS -N --max-time 15 -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"hi","user":"probe","inputs":{}}' -D -
# Expect: content-type: text/event-stream, chunked body with event: / data: frames.
```

## Adversarial test plan — eight tests, one recording

One browser session, one conversation, recorded with `computer.record_start` and annotated via `record_annotate` for each assertion. Every test is designed so a broken implementation fails visibly.

| # | Name | Action | Pass criteria |
|---|---|---|---|
| T1 | Rebrand lands | Navigate to `https://zoracore.dk/` | Tab title is **exactly** `Valhalla AI — Divine Nordic Intelligence`. Header shows `Valhalla AI · Forging Future Systems`. Tagline/anywhere says **Zoracore** → FAIL. |
| T2 | Swarm Visualizer + streaming | Send `In one short paragraph, explain what you are.` | Above textarea: 6-node hex graph with labels EIVOR, ODIN, THOR, FREJA, HEIMDALL, LOKI (`SwarmVisualizer.tsx`). At least one node has cyan glow ring during streaming. After stream ends, all go to idle/dim. Labels visible; cyan progress bar at top. |
| T3 | Forge auto-open on code | Send `Write one Python function add(a,b) that returns a+b. Fenced \`\`\`python block only.` | Right pane slides in; Code tab selected; syntax-highlighted snippet; header shows `add(…)` or `snippet-01.py`. If code stays only in chat bubble or Forge pane closed → FAIL. `ForgePanel.tsx` + `artifacts.ts`. |
| T4 | EIVOR Memory drawer | Click header 🧠 button | Left drawer opens titled **EIVOR Memory**. Stats section renders (`messages`, `code blocks`, `turns`). Tech chips (Next.js, React, Python, etc.) appear if detected. `EivorMemoryPanel.tsx` + `memory.ts`. |
| T5 | Correct the Gods — 👍 | Hover assistant bubble → click thumb-up pill | Pill flips to active; text `Thanks — logged.` appears. Network: `POST /api/chat/feedback` with `rating: "like"` + real `message_id`. **If pills are absent altogether** → `ChatContainer` forgot to pass `userId` + `onFeedback` to `MessageBubble` (root cause of the PR #108 regression — check `ChatContainer.tsx:520-532`). |
| T6 | Correct the Gods — 👎 + free-text | Click thumb-down pill → red panel expands → type feedback → click **Send to EIVOR** | Panel collapses, bubble shows `Logged to EIVOR memory.`. Network: `POST /api/chat/feedback` with `rating: "dislike"` + non-empty `content`. `FeedbackControls.tsx`. |
| T7 | Multi-modal input visibility | Observe input row (left of send) | Paperclip (attach), Link2 (URL), Mic icons ALL present on first paint. Clicking Link2 reveals a URL input. Clicking Mic either toggles cyan active (on devices with mic) or surfaces `Voice: not-allowed` (headless VM) — both are pass states. Mic absent on first paint → regresses Devin Review #2 (`ChatInput.tsx` must use `useState` for `voiceSupported`, not `useRef`). |
| T8 | Download bundle + ship to Vercel | Click header **Download** → zip saves to `/home/ubuntu/Downloads/` → `unzip` → `npx vercel@latest --token $VERCEL_TOKEN --yes` | Zip has 5 entries: `README.md`, `TRANSCRIPT.md`, `DEPLOY.md`, `vercel.json`, `code/snippet-*.ext`. `npx vercel` prints a preview URL and exits 0. **The URL itself returns HTTP 401 when fetched** — that is the zora-core team-level Deployment Protection, NOT a bundle/deploy failure. Pass signal = CLI exit 0 + printed URL. |

Reserve the real Dify upstream for the recording — responses can be long and cycle personas (Odin → Thor → …). This is Dify prompt design, not a bug. Click Stop between long turns; it preserves `conversation_id`.

## Known behaviors (do not mistake for bugs)

- **Dify prompt cycles personas.** The model often answers as Odin, then as Thor, then as Freja in one turn. That's the system prompt — not a loop/retry bug.
- **Headless VM has no microphone.** T7 mic click surfaces `Voice: not-allowed` — the app's graceful permission-denied branch. That IS the pass state on a VM.
- **`zora-core` Vercel team has SSO protection on all preview URLs** (`ssoProtection: all_except_custom_domains`). Any `*.vercel.app` URL returns HTTP 401 when fetched headless. Custom domain (`zoracore.dk`) is exempt. For T8 bundle deploys, the CLI exiting 0 + printing the URL is the real pass signal.
- **Dify can return Cloudflare 504.** Upstream outage. Retry after ~2 min. If persistent, test against prod (cached sessions often still work) and degrade T2/T3 streaming assertions as `untested` rather than failing the whole recording.

## Reporting

- Write `test-report.md` with inline screenshot URLs (upload via `upload_attachment` first so they render in PR comments; don't inline filesystem paths).
- Post ONE comment on the PR with `<details>/<summary>` sections to keep it skimmable.
- Attach the annotated recording to the `message_user` final message.

## Common pitfalls

- **Dify "Model is not configured" (400).** Not a code bug. Escalate. Key owner must bind a model and publish on https://dify.ai.
- **Peer-dep error on `npm install`.** `frontend/.npmrc` has `legacy-peer-deps=true`. If missing, add it.
- **Next.js CVE-blocked Vercel deploy.** Vercel rejects builds on older Next.js (`errorCode: VULNERABLE_NEXTJS_VERSION`). Keep `next` at a version Vercel currently accepts (at time of last test: `16.2.4`).
- **Hobby cron limit on Vercel.** `frontend/vercel.json` crons must be daily (`0 0 * * *`) on Hobby plan, not hourly. Anything more frequent blocks preview deploys.
- **Don't record against a Vercel preview.** SSO gate. Record against `zoracore.dk` (prod) or localhost.
- **Don't curl `/api/chat` with `Authorization` headers.** The proxy rejects anything other than a plain JSON body and injects its own auth server-side.
- **If Correct-the-Gods pills don't render,** check `ChatContainer.tsx` is passing `userId` AND `onFeedback` to `MessageBubble`. Missing either prop makes `FeedbackControls` silently not mount (this was the PR #108 regression).

## Key file map (for reasoning, not for editing during tests)

### API / server
- `frontend/src/app/api/chat/route.ts` — POST streams to Dify; GET is healthcheck; edge runtime. Errors are plain JSON, not SSE-framed.
- `frontend/src/app/api/chat/feedback/route.ts` — POST forwards to Dify `/v1/messages/{id}/feedbacks` for long-term memory.
- `frontend/src/app/api/chat/upload/route.ts` — POST proxies files to Dify `/v1/files/upload`.

### Chat UI (`frontend/src/components/chat/`)
- `ChatContainer.tsx` — top-level state: messages, AbortController, conversation_id round-trip, SSE parsing, feedback handler. **Must pass `userId` + `onFeedback` to MessageBubble** (root cause of PR #108).
- `MessageBubble.tsx` — renders each message + `FeedbackControls` when `userId` + `onFeedback` provided.
- `FeedbackControls.tsx` — 👍/👎 pills, red panel with free-text, `Send to EIVOR` button.
- `ChatInput.tsx` — textarea + paperclip/URL/mic. `voiceSupported` MUST be `useState`, not `useRef` (Devin Review #2 fix; otherwise mic is invisible on first paint).
- `SwarmVisualizer.tsx` — 6-node hex graph with cyan-glow active state.
- `EivorMemoryPanel.tsx` + `memory.ts` — transcript → tech/design/error chip extraction (regex heuristic).
- `ForgePanel.tsx` + `artifacts.ts` — right-pane multi-tab (Code / Architecture / Execution Log). Auto-opens on first code artifact.
- `ForgeMermaid.tsx` — renders \`\`\`mermaid blocks in Architecture tab.
- `bundle.ts` — JSZip generation for Download button (README / TRANSCRIPT / DEPLOY / vercel.json / code/).
- `CodeBlock.tsx` — dark-themed block + Copy.
- `AgentStatusPulse.tsx` — legacy single-line pulse, superseded by SwarmVisualizer but kept as a fallback.
