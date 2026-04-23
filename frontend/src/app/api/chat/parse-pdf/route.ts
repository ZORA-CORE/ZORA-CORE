/**
 * Valhalla AI — server-side PDF text extractor.
 *
 * Accepts a multipart/form-data POST with a `file` (PDF) and returns the
 * extracted text. The text is injected by the client as context for the
 * next chat turn, so the swarm can reason over the document without
 * depending on Dify's multi-modal app configuration.
 *
 * This runs on the Node runtime (unpdf needs it for the pdf.js worker).
 *
 * Request: multipart/form-data
 *   file: File (required, PDF, <= 20 MB)
 *
 * Response 200:
 *   { ok: true, pages: number, characters: number, text: string }
 */

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_RESPONSE_CHARS = 200_000;

function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError('Expected multipart/form-data.', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return jsonError('`file` field is required.', 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError(
      `File too large (${file.size} bytes > ${MAX_UPLOAD_BYTES} bytes).`,
      413,
    );
  }
  const mime = file.type || '';
  const isPdf =
    mime === 'application/pdf' ||
    mime === 'application/x-pdf' ||
    /\.pdf$/i.test(file.name);
  if (!isPdf) {
    return jsonError(`Unsupported MIME type for PDF extraction: ${mime}`, 415);
  }

  let extracted: { text: string; pages: number };
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const buf = new Uint8Array(await file.arrayBuffer());
    const doc = await getDocumentProxy(buf);
    const { text, totalPages } = await extractText(doc, { mergePages: true });
    extracted = {
      text: Array.isArray(text) ? text.join('\n\n') : text,
      pages: totalPages,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return jsonError(`PDF parse failed: ${reason}`, 500);
  }

  let text = extracted.text.replace(/\s+\n/g, '\n').trim();
  const truncated = text.length > MAX_RESPONSE_CHARS;
  if (truncated) {
    text =
      text.slice(0, MAX_RESPONSE_CHARS) +
      `\n\n… [truncated, original had ${extracted.text.length.toLocaleString()} characters]`;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      pages: extracted.pages,
      characters: text.length,
      truncated,
      text,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}
