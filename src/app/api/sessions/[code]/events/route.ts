import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionEventSchema } from "@/lib/validation";
import { badRequest, notFound, readJson } from "@/lib/http";
import { isValidSessionCode } from "@/lib/session-codes";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  if (!isValidSessionCode(code)) return notFound("Session not found");

  const json = await readJson(req);
  if (!json) return badRequest();
  const parsed = sessionEventSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
  }

  const session = await prisma.gameSession.findUnique({
    where: { code },
    select: { id: true, status: true },
  });
  if (!session) return notFound("Session not found");
  if (session.status === "ended") {
    return badRequest("Session has ended");
  }

  const event = await prisma.gameSessionEvent.create({
    data: { sessionId: session.id, ...parsed.data },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, id: event.id, at: event.createdAt });
}
