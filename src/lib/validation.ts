import { z } from "zod";
import { Difficulty } from "@prisma/client";

const shortText = (min: number, max: number) => z.string().trim().min(min).max(max);
const jsonObject = z.record(z.string(), z.unknown());
const jsonObjectArray = (max = 100) => z.array(jsonObject).max(max);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().min(5).max(254),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/).toLowerCase(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  identity: z.string().trim().min(3).max(254).toLowerCase(),
  password: z.string().min(8),
});

export const packSchema = z.object({
  title: shortText(3, 120),
  description: shortText(10, 2000),
  isPublic: z.boolean().default(false),
});

export const packUpdateSchema = packSchema.partial();

export const scenarioSchema = z.object({
  title: shortText(3, 120),
  summary: shortText(10, 2000),
  type: shortText(3, 120),
  durationMin: z.number().int().min(5).max(180),
  difficulty: z.enum(Difficulty),
  contextJson: jsonObject.default({}),
  eventsJson: jsonObjectArray(200).default([]),
  hintsJson: jsonObjectArray(100).default([]),
  actionsJson: jsonObjectArray(200).default([]),
  gmScriptJson: jsonObject.nullable().optional(),
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
  title: shortText(3, 120),
  summary: shortText(10, 2000),
  type: shortText(3, 120),
  durationMin: z.number().int().min(5).max(180).default(20),
  difficulty: z.enum(Difficulty).default(Difficulty.MIDDLE),
  contextJson: jsonObject.default({}),
  eventsJson: jsonObjectArray(200).default([]),
  hintsJson: jsonObjectArray(100).default([]),
  actionsJson: jsonObjectArray(200).default([]),
  gmScriptJson: jsonObject.nullable().optional(),
});
