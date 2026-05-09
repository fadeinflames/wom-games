import { NextResponse } from "next/server";

const DEFAULT_JSON_MAX_BYTES = 256 * 1024;

export type ReadJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function readJson<T = unknown>(
  req: Request,
  opts: { maxBytes?: number } = {},
): Promise<ReadJsonResult<T>> {
  const maxBytes = opts.maxBytes ?? DEFAULT_JSON_MAX_BYTES;
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) {
    return { ok: false, response: badRequest("Expected application/json") };
  }

  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > maxBytes) {
    return { ok: false, response: payloadTooLarge(maxBytes) };
  }

  const raw = await req.text();
  if (!raw.trim()) {
    return { ok: false, response: badRequest("Empty JSON body") };
  }
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { ok: false, response: payloadTooLarge(maxBytes) };
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false, response: badRequest("Malformed JSON") };
  }
}

export function badRequest(message = "Invalid payload") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message = "Conflict") {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function payloadTooLarge(maxBytes: number) {
  return NextResponse.json(
    { error: `JSON body too large. Limit is ${maxBytes} bytes.` },
    { status: 413 },
  );
}

export function tooMany(retryAfterMs: number) {
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: { "Retry-After": Math.ceil(retryAfterMs / 1000).toString() },
    },
  );
}

export function internalError(message = "Internal error") {
  return NextResponse.json({ error: message }, { status: 500 });
}
