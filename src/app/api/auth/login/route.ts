import { NextResponse } from "next/server";
import { createSession, loginUser } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { badRequest, readJson, tooMany, unauthorized } from "@/lib/http";
import { clientKeyFromRequest, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const gate = rateLimit(clientKeyFromRequest(req, "login"), {
    limit: 10,
    windowMs: 60_000,
  });
  if (!gate.ok) {
    return tooMany(gate.retryAfterMs);
  }

  const json = await readJson(req);
  if (!json) {
    return badRequest();
  }
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
  }

  const user = await loginUser(parsed.data);
  if (!user) {
    return unauthorized("Invalid credentials");
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
