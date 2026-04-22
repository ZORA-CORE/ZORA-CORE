# Testing the Zoracore `/chat` (Dify SSE proxy)

Applies whenever you touch `frontend/src/app/chat/**`, `frontend/src/components/chat/**`, or `frontend/src/app/api/chat/route.ts`.

## Devin Secrets Needed

- `DIFY_API_KEY_ZORACORE_CHAT` — repo-scoped. The Dify App API key (starts with `app-`) the proxy forwards to. Written to `frontend/.env.local` as `DIFY_API_KEY` for local `next dev`, and set on the `zora-core` + `ai` Vercel projects (Prod/Preview/Dev) for deployed builds. **Precondition:** the Dify app behind this key must have an LLM model bound; otherwise every request returns `400 {"message":"Model is not configured"}`.
- `VERCEL_TOKEN` — org-scoped. Used for deployment log inspection (`vercel inspect <url> --logs`). Not needed for normal testing.

## Where to run the tests

**Do not try to test against the Vercel preview URL.** The Vercel team has `ssoProtection: all_except_custom_domains`, which blocks headless browser access. Run the branch locally instead — the bundle is byte-identical:

```bash
cd /home/ubuntu/repos/ZORA-CORE/frontend
npm install --legacy-peer-deps   # .npmrc already sets this
echo "DIFY_API_KEY=$DIFY_API_KEY_ZORACORE_CHAT" > .env.local
npm run dev -- -p 3000
```

Then test at `http://localhost:3000/chat`.

## Pre-test sanity check (1 minute, no GUI)

Before opening a browser, verify (a) Dify responds successfully and (b) the proxy forwards SSE. These two curls will save you from recording a blank-screen test:

```bash
# 1. Dify directly
curl -sS -X POST https://api.dify.ai/v1/chat-messages \
  -H "Authorization: Bearer $DIFY_API_KEY_ZORACORE_CHAT" \
  -H "Content-Type: application/json" \
  -d '{"inputs":{},"query":"hi","response_mode":"blocking","user":"probe"}'
# Expect: 200 with {"answer":"...","conversation_id":"..."}
# If you see 400 {"message":"Model is not configured"} → STOP, escalate to Founder. No amount of client-side fixing will unblock you; a model must be bound on the Dify app.

# 2. Proxy end-to-end
curl -sS -N --max-time 15 -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"hi","user":"probe","inputs":{}}' -D -
# Expect response headers: content-type: text/event-stream, transfer-encoding: chunked
# And a body of `event:` / `data:` frames including `conversation_id`.
```

If Dify is misconfigured, this is NOT a code bug. Tell the Founder that the Dify app needs a model bound (Dify Studio → the app → Model Provider/Prompt-Eng panel → bind an LLM → publish), or request a different key.

## Adversarial test plan (the ONE recording)

One browser session, one conversation, recorded with `computer.record_start` and annotated with `record_annotate` for each assertion. Every test below is designed so a broken implementation would fail visibly.

| # | Name | Prompt | Pass criteria |
|---|---|---|---|
| T1 | Empty state | (none, navigate) | Logo + "Zoracore" heading + 4 cards with **exact** titles "Build a Fintech App", "Create a Library System", "Forge a Nordic Landing Page", "Refactor a Legacy API". Pulse reads "Ready" with GREY dot. Send button disabled. |
| T2 | Stream | `In exactly one sentence, introduce yourself as Zoracore.` | Cyan 2px progress bar animates at top; pulse flips from grey "Ready" to CYAN + one of Odin/Thor/Freja/Eivor, label changes at least once during the wait; assistant bubble grows via multiple DOM mutations (not atomic replace). Network: one `/api/chat` request with `content-type: text/event-stream`; NO request from the browser to `api.dify.ai`. |
| T3 | Code block | `Write a tiny TypeScript function that adds two numbers. Respond with only a fenced ts code block.` | Dark bg `#0f0f12`, uppercase language label (`TS`/`TYPESCRIPT`/`PYTHON` depending on model), Lucide Copy button. Clicking Copy flips to "Copied" for ~1.6s and clipboard actually contains the code. |
| T4 | Memory | `What exactly did I ask you in my previous message? Quote it back verbatim.` | Assistant quotes T2's prompt verbatim. Mechanism: `ChatContainer.tsx` captures `conversation_id` from first SSE frame and re-sends it. Network: the 2nd POST body has `conversation_id: "<uuid>"`, the 1st had it undefined/omitted. |
| T5 | New chat abort | 1) Send a 300-word essay prompt → 2) click "New chat" while streaming → 3) send `What did I ask you about previously?` | (a) Messages clear instantly to empty state. (b) Pulse returns to grey "Ready". (c) In-flight `/api/chat` request shows `cancelled` / `net::ERR_ABORTED` in the network tab. (d) Fresh turn's assistant says something like "no previous conversation history" — proving `setConversationId('')` reset. |
| T6 | Security | `curl` + `grep` | `GET /api/chat` → EXACTLY `{"service":"zoracore-chat-proxy","status":"ok"}`. `grep -r "$DIFY_API_KEY_ZORACORE_CHAT" frontend/.next/` returns ZERO matches. The key must live only in `.env.local` / Vercel env. |

Reserve the real Dify upstream for the recording — turn-level responses can be long and the Dify model may cycle personas (Odin → Thor → …). This is the Dify prompt design, not a bug. Click the Stop button between T3 and T4 to end long streams early; it still preserves the conversation_id.

## Reporting

- Write `test-report.md` with inline screenshot URLs (not filesystem paths — upload with `upload_attachment` first so they render in PR comments).
- Post ONE comment on the PR with `<details>/<summary>` sections to keep it skimmable.
- Attach the annotated recording to the `message_user` final message.

## Common pitfalls

- **Dify "Model is not configured" (400).** Not a code bug. Escalate. The key owner must bind a model and publish on https://dify.ai.
- **Peer-dep error on `npm install`.** `frontend/.npmrc` has `legacy-peer-deps=true`. If it's missing, add it.
- **Next.js CVE-blocked Vercel deploy.** Vercel rejects builds on older Next.js (`errorCode: VULNERABLE_NEXTJS_VERSION`). Keep `next` at a version Vercel currently accepts (at time of last test: `16.2.4`).
- **Hobby cron limit on Vercel.** `frontend/vercel.json` crons must be daily (`0 0 * * *`) on Hobby plan, not hourly. Anything more frequent blocks preview deploys.
- **Don't use the Vercel preview for recording.** SSO gate. Run locally.
- **Don't curl `/api/chat` with Authorization headers** — the proxy rejects anything other than a plain JSON body and injects its own auth server-side.

## Key file map (for reasoning, not for editing during tests)

- `frontend/src/app/api/chat/route.ts` — POST streams to Dify, GET returns minimal healthcheck, errors are plain JSON (not SSE-framed). Edge runtime.
- `frontend/src/components/chat/ChatContainer.tsx` — message state, AbortController, `conversation_id` round-trip, SSE parsing of `event`/`answer`/`conversation_id`.
- `frontend/src/components/chat/AgentStatusPulse.tsx` — 2.2s rotation between Odin/Thor/Freja/Eivor.
- `frontend/src/components/chat/EmptyState.tsx` — the 4 quick-start cards. If titles change, T1 pass criteria must change.
- `frontend/src/components/chat/CodeBlock.tsx` — dark-themed block + Copy. If background/label colors change, update T3.
