import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionEventSchema } from "@/lib/validation";
import { badRequest, notFound, readJson, tooMany } from "@/lib/http";
import { clientKeyFromRequest, rateLimit } from "@/lib/rate-limit";
import { isValidSessionCode } from "@/lib/session-codes";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  if (!isValidSessionCode(code)) return notFound("Session not found");

  const gate = rateLimit(clientKeyFromRequest(req, `session-events:${code}`), {
    limit: 120,
    windowMs: 60_000,
  });
  if (!gate.ok) return tooMany(gate.retryAfterMs);

  const json = await readJson(req);
  if (!json.ok) return json.response;
  const parsed = sessionEventSchema.safeParse(json.data);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
  }
  if (parsed.data.kind === "start") {
    return badRequest("Start events are created by the server");
  }

  const session = await prisma.gameSession.findUnique({
    where: { code },
    select: { id: true, status: true, scenarioId: true },
  });
  if (!session) return notFound("Session not found");
  if (session.status === "ended") {
    return badRequest("Session has ended");
  }
  if (session.status !== "active" || !session.scenarioId) {
    return badRequest("Session is not active yet");
  }

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.gameSessionEvent.create({
      data: { sessionId: session.id, ...parsed.data },
      select: { id: true, createdAt: true },
    });

    if (parsed.data.kind === "end") {
      await tx.gameSession.update({
        where: { id: session.id },
        data: { status: "ended" },
      });
    }

    return created;
  });

  return NextResponse.json({ ok: true, id: event.id, at: event.createdAt });
}
