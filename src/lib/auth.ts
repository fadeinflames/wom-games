import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "wom_session";
const SESSION_DAYS = 30;

// Pre-computed dummy hash for timing-safe login: prevents user enumeration
// by ensuring bcrypt.compare runs even when the user is not found.
const DUMMY_HASH = "$2b$10$abcdefghijklmnopqrstuuMh6gkBN5Nt/3bGsN2ABdX7bR1jvkXfC";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function constantTimeEqualsHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: sha256(token) },
    });
  }

  jar.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = sha256(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  // Mitigates token enumeration: constant-time compare (unique lookup already
  // narrows risk, kept for defense in depth).
  if (!session || !constantTimeEqualsHex(session.tokenHash, tokenHash)) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    // Best-effort cleanup; ignore failure when invoked from a read-only
    // Server Component (cookies() write would throw there).
    try {
      await prisma.session.delete({ where: { id: session.id } });
    } catch {
      // ignore
    }
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function registerUser(input: {
  email: string;
  username: string;
  password: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      username: input.username.toLowerCase(),
      passwordHash,
    },
  });
}

export async function loginUser(input: { identity: string; password: string }) {
  const identity = input.identity.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identity }, { username: identity }],
    },
  });

  // Always run bcrypt.compare to keep timing roughly constant whether or not
  // the account exists.
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
  const isValid = await bcrypt.compare(input.password, hashToCompare);

  if (!user || !isValid) {
    return null;
  }

  return user;
}
