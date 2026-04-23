import { z } from "zod";
import { Difficulty } from "@prisma/client";

export const registerSchema = z.object({
  email: z.email().min(5),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  identity: z.string().min(3),
  password: z.string().min(8),
});

export const packSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  isPublic: z.boolean().default(false),
});

export const packUpdateSchema = packSchema.partial();

export const scenarioSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().min(10).max(2000),
  type: z.string().min(3).max(120),
  durationMin: z.number().int().min(5).max(180),
  difficulty: z.enum(Difficulty),
  contextJson: z.record(z.string(), z.unknown()).default({}),
  eventsJson: z.array(z.record(z.string(), z.unknown())).default([]),
  hintsJson: z.array(z.record(z.string(), z.unknown())).default([]),
  actionsJson: z.array(z.record(z.string(), z.unknown())).default([]),
  gmScriptJson: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const createGameSessionSchema = z.object({
  packId: z.string().min(10),
  scenarioId: z.string().min(10).optional().nullable(),
});

export const pickScenarioSchema = z.object({
  scenarioId: z.string().min(10),
});

export const sessionEventSchema = z.object({
  kind: z.enum(["action", "round", "start", "end"]),
  round: z.number().int().min(0).max(20).default(0),
  phase: z.string().max(40).optional().nullable(),
  actionKey: z.string().max(40).optional().nullable(),
  actionTitle: z.string().max(200).optional().nullable(),
  actionVariant: z.string().max(10).optional().nullable(),
  actionResult: z.string().max(4000).optional().nullable(),
  score: z.number().int().min(0).max(9999).default(0),
  panic: z.number().int().min(0).max(200).default(0),
});

export const importPayloadSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().min(10).max(2000),
  type: z.string().min(3).max(120),
  durationMin: z.number().int().min(5).max(180).default(20),
  difficulty: z.enum(Difficulty).default(Difficulty.MIDDLE),
  contextJson: z.record(z.string(), z.unknown()).default({}),
  eventsJson: z.array(z.record(z.string(), z.unknown())).default([]),
  hintsJson: z.array(z.record(z.string(), z.unknown())).default([]),
  actionsJson: z.array(z.record(z.string(), z.unknown())).default([]),
  gmScriptJson: z.record(z.string(), z.unknown()).nullable().optional(),
});
