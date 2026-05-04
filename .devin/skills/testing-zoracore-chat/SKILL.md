# Testing the Valhalla AI chat (`zoracore.dk`) — Dify SSE proxy

Applies whenever you touch `frontend/src/app/chat/**`, `frontend/src/components/chat/**`, `frontend/src/app/api/chat/**`, or the root page `frontend/src/app/page.tsx` (which aliases to the chat).

The app was renamed from **Zoracore** → **Valhalla AI** in PR #105. All user-facing strings use Valhalla AI; internal code paths still say `zoracore-chat-proxy` for the API health response.

## Devin Secrets Needed

- `DIFY_API_KEY_ZORACORE_CHAT` — repo-scoped. The Dify App API key (starts with `app-`) the proxy forwards to. Written to `frontend/.env.local` as `DIFY_API_KEY` for local `next dev`, and set on the `zora-core` + `ai` Vercel projects (Prod/Preview/Dev). **Precondition:** the Dify app behind this key must have an LLM model bound; otherwise every request returns `400 {"message":"Model is not configured"}`.
- `VERCEL_TOKEN` — org-scoped. Used for `vercel inspect <url> --logs` on failed builds, and for the T8 "ship bundle to Vercel" assertion.
- Cognition Mirror `/chat/mirror` UI-shell tests do **not** require Dify or Supabase secrets unless the test explicitly covers chat streaming, migrations, or runtime persistence.
- `E2B_API_KEY` — required for Cognition Mirror runtime-gateway tests that execute real `terminal_send`, `editor_write`, browser screenshot, or gateway lifecycle calls.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — required only for DB-backed Mirror session/event persistence and replay tests. If these are present but `/api/mirror/sessions` returns Supabase `PGRST205` for `public.valhalla_agent_sessions`, the target database likely has not applied `supabase/migrations/008_valhalla_cognition_mirror.sql`; mark DB persistence as blocked rather than claiming replay passed.

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

For Cognition Mirror UI-shell-only testing, Dify is not needed; `npm run dev -- -p 3000` is enough and the route is `http://localhost:3000/chat/mirror`.

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

# 3. Cognition Mirror route (if testing /chat/mirror)
curl -sS -I --max-time 20 http://localhost:3000/chat/mirror
# Expect: HTTP/1.1 200 OK.
```

## Cognition Mirror `/chat/mirror` UI-shell smoke test

Use this when touching `frontend/src/app/chat/mirror/**`, `frontend/src/components/valhalla-mirror/**`, `frontend/src/lib/valhalla/mirror/**`, or the Mirror nav entry in `AppShell.tsx`.

One focused recording is enough for the shell. Open `http://localhost:3000/chat/mirror`, then verify:

| # | Name | Action | Pass criteria |
|---|---|---|---|
| M1 | Hydration-safe render | Load `/chat/mirror`; read browser console after first paint | Header shows `Cognition Mirror` and `Swarm of Devins Workspace`; status chips show `Schema ready`, `Event bus typed`, `UI shell live`; event replay shows stable labels like `T-02:00`, `T-01:15`, `T-00:30`; console has no `Hydration failed` or `server rendered text didn't match the client`. |
| M2 | Six-agent rail + switching | Verify rail labels, then click `EIVOR`, `ODIN`, `HEIMDALL`, `LOKI`, `THOR`, and `FREJA` | Rail shows all six labels: `EIVOR`, `ODIN`, `HEIMDALL`, `LOKI`, `THOR`, `FREJA`. Each click updates Planner and Workspace headings to that agent. Expected terminal probes: `eivor@valhalla:~/memory$ retrieve session-context`, ODIN terminal names `EIVOR, HEIMDALL, LOKI, THOR, and FREJA`, `heimdall@valhalla:~/audit$ scan mirror-contract`, `loki@valhalla:~/chaos$ falsify mirror-ui`, `thor@valhalla:~/repo$ npm run build`, and `freja@valhalla:~/ui$ pnpm visual-check`. |
| M3 | Workspace tabs | With FREJA selected, click `Editor`, `Browser`, `PR / CI` | Editor shows `frontend/src/components/valhalla-mirror/CognitionMirrorWorkspace.tsx` and `DevinCloneWorkspace`; Browser shows `Live Browser Feed`, `https://zoracore.dk/chat/mirror`, and `Quad-Pane UI inspection`; PR/CI shows `devin/cognition-mirror`, `Pending implementation PR`, and `Awaiting checks`. |

Known limitation: Mirror runtime execution, live xterm stdin/stdout, Monaco editing, and Chromium frame streaming may still be placeholders until the persistent runtime gateway lands. Do not fail UI-shell tests just because those future integrations are not live yet.


## Cognition Mirror runtime API / E2B tests

Use this when touching `frontend/src/lib/valhalla/mirror/runtime-gateway.ts`, `frontend/src/app/api/mirror/sessions/**`, or Mirror persistence/replay code.

Do not record the desktop for shell/API-only runtime tests. Capture command output as text evidence instead.

Recommended checks:

| # | Name | Action | Pass criteria |
|---|---|---|---|
| R1 | Gateway concurrency guard | From `frontend`, run a temporary `tsx` harness that imports `E2BMirrorRuntimeGateway` and calls `Promise.all([gateway.ensureSession(params), gateway.ensureSession(params), gateway.ensureSession(params)])` with identical `agent`, `userId`, and `chatSessionId`. | All returned `sessionId` values are identical; all returned `sandboxId` values are identical; invoking `terminal_send` returns `summary: "terminal_send exit=0"` and expected stdout. |
| R2 | Gateway stop cleanup | In the same harness, call `gateway.stop(session)`, then try `gateway.invoke(stoppedSession, ...)`, then call `gateway.ensureSession(params)` again. | Invoking the stopped session throws `No sandbox for mirror-...`; the recreated session id differs from the stopped session id; the recreated session can run `terminal_send exit=0`. |
| R3 | Command route E2B execution | Run `npm run dev -- -p 3000` with `E2B_API_KEY` set. If Supabase Mirror tables are not applied, unset `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for this seed-mode check. POST to `/api/mirror/sessions/<id>/commands` with `execute: true`, `agent: "thor"`, and `command.tool: "terminal_send"`. | HTTP 200; `observation.ok: true`; `observation.summary: "terminal_send exit=0"`; returned events include stdout and `terminal_exit.exitCode: 0`. With Supabase disabled, `source` should be `seed`; with Supabase enabled and migrated, `source` should be `database`. |
| R4 | DB-backed persistence precondition | If testing replay/persistence, first POST to `/api/mirror/sessions` to create a real UUID session and then post commands to that UUID. | Do not use arbitrary strings as DB-backed `sessionId`; `valhalla_tool_events.agent_session_id` is a UUID foreign key. If Supabase returns `PGRST205` for `valhalla_agent_sessions`, migrations are missing in that environment and replay should be reported as blocked. |


## Adversarial test plan — eight tests, one recording

One browser session, one conversation, recorded with `computer.record_start` and annotated via `record_annotate` for each assertion. Every test is designed so a broken implementation fails visibly.

| # | Name | Action | Pass criteria |
|---|---|---|---|
| T1 | Rebrand lands | Navigate to `https://zoracore.dk/` | Tab title is **exactly** `Valhalla AI — Divine Nordic Intelligence`. Header shows `Valhalla AI · Forging Future Systems`. Tagline/anywhere says **Zoracore** → FAIL. |
| T2 | Swarm Visualizer + streaming | Send `In one short paragraph, explain what you are.` | Above textarea: 6-node hex graph with labels EIVOR, ODIN, THOR, FREJA, HEIMDALL, LOKI (`SwarmVisualizer.tsx`). At least one node has cyan glow ring during streaming. After stream ends, all go to idle/dim. Labels visible; cyan progress bar at top. |
| T3 | Forge auto-open on code | Send `Write one Python function add(a,b) that returns a+b. Fenced ```python block only.` | Right pane slides in; Code tab selected; syntax-highlighted snippet; header shows `add(…)` or `snippet-01.py`. If code stays only in chat bubble or Forge pane closed → FAIL. `ForgePanel.tsx` + `artifacts.ts`. |
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
- **Cognition Mirror UI panes may still be placeholders even when the runtime API works.** If `/chat/mirror` shows seeded terminal/editor/browser/PR-CI content but not a real interactive xterm or live Chromium stream, test the backend runtime gateway through the API/harness section above.
- **Supabase `PGRST205` for `valhalla_agent_sessions` blocks DB-backed Mirror persistence tests.** This means the target DB schema cache does not know the Mirror migration tables. Use seed-mode E2B route testing to verify runtime execution, and mark DB replay/persistence as blocked.
- **`wmctrl` may be unavailable on the VM.** If the browser is already full-width, continue recording; otherwise maximize through the desktop/window manager manually before recording.

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
- `ForgeMermaid.tsx` — renders ```mermaid blocks in Architecture tab.

### Cognition Mirror UI (`frontend/src/components/valhalla-mirror/`)
- `CognitionMirrorWorkspace.tsx` — `/chat/mirror` workspace shell: agent rail, planner, event replay, and Terminal/Editor/Browser/PR-CI tabs.
- `frontend/src/app/chat/mirror/page.tsx` — route entrypoint for the Mirror workspace.
- `frontend/src/lib/valhalla/mirror/events.ts` — typed Mirror event contract used by the UI and persistence layer.
- `frontend/src/lib/valhalla/mirror/runtime-gateway.ts` — E2B-backed Mirror runtime gateway. `ensureSession()` should dedupe pending sessions; `stop()` should clear cached sessions and sandbox handles.
- `frontend/src/app/api/mirror/sessions/[sessionId]/commands/route.ts` — public Mirror command route. `execute: true` triggers E2B runtime execution before seed/database persistence response handling.
- `frontend/src/app/api/mirror/sessions/route.ts` — creates real DB-backed Mirror agent session UUIDs for persistence tests.
