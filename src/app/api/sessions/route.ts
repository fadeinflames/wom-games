import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGameSessionSchema } from "@/lib/validation";
import { badRequest, internalError, notFound, readJson, unauthorized } from "@/lib/http";
import { genSessionCode } from "@/lib/session-codes";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const json = await readJson(req);
  if (!json.ok) return json.response;
  const parsed = createGameSessionSchema.safeParse(json.data);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
  }

  const pack = await prisma.gamePack.findUnique({
    where: { id: parsed.data.packId },
    select: { id: true, isPublic: true, ownerId: true },
  });
  if (!pack) return notFound("Pack not found");
  if (!pack.isPublic && pack.ownerId !== user.id) {
    return notFound("Pack not found");
  }

  if (parsed.data.scenarioId) {
    const scenario = await prisma.scenario.findUnique({
      where: { id: parsed.data.scenarioId },
      select: { id: true, packId: true },
    });
    if (!scenario || scenario.packId !== pack.id) {
      return badRequest("Scenario does not belong to this pack");
    }
  }

  for (let i = 0; i < 10; i++) {
    const code = genSessionCode();
    try {
      const session = await prisma.$transaction(async (tx) => {
        const created = await tx.gameSession.create({
          data: {
            code,
            packId: pack.id,
            scenarioId: parsed.data.scenarioId ?? null,
            gmUserId: user.id,
            status: parsed.data.scenarioId ? "active" : "waiting",
          },
          select: { id: true, code: true, status: true, scenarioId: true },
        });

        await tx.gameSessionEvent.create({
          data: { sessionId: created.id, kind: "start", round: 0 },
        });

        return created;
      });

      return NextResponse.json({
        id: session.id,
        code: session.code,
        status: session.status,
        scenarioId: session.scenarioId,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      console.error("create session failed", error);
      return internalError();
    }
  }

  return badRequest("Could not allocate session code, try again");
}
