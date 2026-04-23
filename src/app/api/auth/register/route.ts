import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createSession, registerUser } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { badRequest, conflict, readJson, tooMany } from "@/lib/http";
import { clientKeyFromRequest, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const gate = rateLimit(clientKeyFromRequest(req, "register"), {
    limit: 5,
    windowMs: 60_000,
  });
  if (!gate.ok) {
    return tooMany(gate.retryAfterMs);
  }

  const json = await readJson(req);
  if (!json) {
    return badRequest();
  }
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
  }

  try {
    const user = await registerUser(parsed.data);
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return conflict("User with this email or username already exists");
    }
    console.error("register failed", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
