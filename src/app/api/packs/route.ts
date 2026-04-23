import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { packSchema } from "@/lib/validation";
import { badRequest, readJson, unauthorized } from "@/lib/http";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const json = await readJson(req);
  if (!json) {
    return badRequest();
  }
  const parsed = packSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
  }

  const pack = await prisma.gamePack.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      isPublic: parsed.data.isPublic,
    },
  });

  return NextResponse.json({ id: pack.id });
}
