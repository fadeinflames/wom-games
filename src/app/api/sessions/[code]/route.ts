import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pickScenarioSchema } from "@/lib/validation";
import { badRequest, notFound, readJson, unauthorized } from "@/lib/http";
import { isValidSessionCode } from "@/lib/session-codes";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  if (!isValidSessionCode(code)) return notFound("Session not found");
  const user = await getCurrentUser();

  const session = await prisma.gameSession.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      status: true,
      scenarioId: true,
      gmUserId: true,
      pack: {
        select: {
          id: true,
          title: true,
          scenarios: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              summary: true,
              difficulty: true,
              durationMin: true,
              type: true,
              contextJson: true,
              eventsJson: true,
            },
          },
        },
      },
      scenario: {
        select: {
          id: true,
          title: true,
          summary: true,
          difficulty: true,
          durationMin: true,
          type: true,
          contextJson: true,
          eventsJson: true,
          hintsJson: true,
          gmScriptJson: true,
          actionsJson: true,
        },
      },
      gm: { select: { id: true, username: true } },
      events: {
        orderBy: { createdAt: "asc" },
        take: 200,
      },
    },
  });
  if (!session) return notFound("Session not found");

  const isGm = user?.id === session.gmUserId;
  if (!isGm) {
    return NextResponse.json({
      session: {
        id: session.id,
        code: session.code,
        status: session.status,
        scenarioId: session.scenarioId,
        pack: session.pack,
        gm: { username: session.gm.username },
        scenario: session.scenario
          ? {
              id: session.scenario.id,
              title: session.scenario.title,
              summary: session.scenario.summary,
              difficulty: session.scenario.difficulty,
              durationMin: session.scenario.durationMin,
              type: session.scenario.type,
              contextJson: session.scenario.contextJson,
              eventsJson: session.scenario.eventsJson,
            }
          : null,
      },
    });
  }

  return NextResponse.json({ session });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  const { code } = await ctx.params;
  if (!isValidSessionCode(code)) return notFound("Session not found");

  const json = await readJson(req);
  if (!json) return badRequest();
  const parsed = pickScenarioSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");

  const session = await prisma.gameSession.findUnique({
    where: { code },
    select: { id: true, packId: true, gmUserId: true, scenarioId: true },
  });
  if (!session) return notFound("Session not found");

  // Players may pick scenario if session is open; owner (GM) always may change it.
  const isGm = user?.id === session.gmUserId;
  if (!isGm && session.scenarioId) {
    return unauthorized("Scenario already chosen");
  }

  const scenario = await prisma.scenario.findUnique({
    where: { id: parsed.data.scenarioId },
    select: { id: true, packId: true },
  });
  if (!scenario || scenario.packId !== session.packId) {
    return badRequest("Scenario does not belong to this session pack");
  }

  const updated = await prisma.gameSession.update({
    where: { id: session.id },
    data: { scenarioId: scenario.id, status: "active" },
    select: { id: true, code: true, status: true, scenarioId: true },
  });

  await prisma.gameSessionEvent.create({
    data: { sessionId: session.id, kind: "start", round: 1, phase: "DETECTION" },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { code } = await ctx.params;
  if (!isValidSessionCode(code)) return notFound("Session not found");

  const session = await prisma.gameSession.findUnique({
    where: { code },
    select: { id: true, gmUserId: true },
  });
  if (!session || session.gmUserId !== user.id) return notFound("Session not found");

  await prisma.gameSession.update({
    where: { id: session.id },
    data: { status: "ended" },
  });

  await prisma.gameSessionEvent.create({
    data: { sessionId: session.id, kind: "end", round: 0 },
  });

  return NextResponse.json({ ok: true });
}
