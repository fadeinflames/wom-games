import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scenarioSchema } from "@/lib/validation";
import { badRequest, notFound, readJson, unauthorized } from "@/lib/http";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const json = await readJson(req);
  if (!json) return badRequest();

  const parsed = scenarioSchema
    .extend({ packId: z.string().min(10) })
    .safeParse(json);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
  }

  const pack = await prisma.gamePack.findUnique({
    where: { id: parsed.data.packId },
  });

  if (!pack || pack.ownerId !== user.id) {
    return notFound("Pack not found");
  }

  const lastScenario = await prisma.scenario.findFirst({
    where: { packId: pack.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const scenario = await prisma.scenario.create({
    data: {
      packId: pack.id,
      title: parsed.data.title,
      summary: parsed.data.summary,
      type: parsed.data.type,
      difficulty: parsed.data.difficulty,
      durationMin: parsed.data.durationMin,
      contextJson: parsed.data.contextJson as Prisma.InputJsonValue,
      eventsJson: parsed.data.eventsJson as Prisma.InputJsonValue,
      hintsJson: parsed.data.hintsJson as Prisma.InputJsonValue,
      actionsJson: parsed.data.actionsJson as Prisma.InputJsonValue,
      gmScriptJson: parsed.data.gmScriptJson as Prisma.InputJsonValue,
      position: (lastScenario?.position ?? 0) + 1,
    },
  });

  return NextResponse.json({ id: scenario.id });
}
