import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { packUpdateSchema } from "@/lib/validation";
import { badRequest, notFound, readJson, unauthorized } from "@/lib/http";

type Ctx = { params: Promise<{ packId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { packId } = await ctx.params;

  const json = await readJson(req);
  if (!json) return badRequest();
  const parsed = packUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
  }

  const pack = await prisma.gamePack.findUnique({ where: { id: packId } });
  if (!pack || pack.ownerId !== user.id) return notFound("Pack not found");

  const updated = await prisma.gamePack.update({
    where: { id: pack.id },
    data: parsed.data,
  });

  return NextResponse.json({ id: updated.id });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { packId } = await ctx.params;

  const pack = await prisma.gamePack.findUnique({ where: { id: packId } });
  if (!pack || pack.ownerId !== user.id) return notFound("Pack not found");

  await prisma.gamePack.delete({ where: { id: pack.id } });
  return NextResponse.json({ ok: true });
}
