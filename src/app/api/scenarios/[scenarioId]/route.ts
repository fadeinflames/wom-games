import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, unauthorized } from "@/lib/http";

type Ctx = { params: Promise<{ scenarioId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { scenarioId } = await ctx.params;

  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { pack: true },
  });

  if (!scenario || scenario.pack.ownerId !== user.id) {
    return notFound("Scenario not found");
  }

  await prisma.scenario.delete({ where: { id: scenario.id } });
  return NextResponse.json({ ok: true });
}
