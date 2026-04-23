import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { importPayloadSchema } from "@/lib/validation";
import { badRequest, notFound, readJson, unauthorized } from "@/lib/http";

const importSchema = z.object({
  packId: z.string().min(10),
  scenarios: z.array(importPayloadSchema).min(1).max(100),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const json = await readJson(req);
  if (!json) return badRequest();

  const parsed = importSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid import payload");
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
  let position = lastScenario?.position ?? 0;

  await prisma.$transaction(
    parsed.data.scenarios.map((scenario) => {
      position += 1;
      return prisma.scenario.create({
        data: {
          packId: pack.id,
          title: scenario.title,
          summary: scenario.summary,
          type: scenario.type,
          difficulty: scenario.difficulty,
          durationMin: scenario.durationMin,
          contextJson: scenario.contextJson as Prisma.InputJsonValue,
          eventsJson: scenario.eventsJson as Prisma.InputJsonValue,
          hintsJson: scenario.hintsJson as Prisma.InputJsonValue,
          actionsJson: scenario.actionsJson as Prisma.InputJsonValue,
          gmScriptJson: scenario.gmScriptJson as Prisma.InputJsonValue,
          position,
        },
      });
    }),
  );

  return NextResponse.json({ ok: true, count: parsed.data.scenarios.length });
}
