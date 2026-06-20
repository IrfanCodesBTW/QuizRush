import { z } from "zod";

export const emailSchema = z.string().email().max(160);
export const passwordSchema = z.string().min(8).max(128);
export const usernameSchema = z.string().trim().min(2).max(32);
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^QR-[0-9A-Z]{4}$/);

export const guestSchema = z.object({
  username: usernameSchema.optional(),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const joinRoomSchema = z.object({
  roomCode: roomCodeSchema,
});

export const createRoomSchema = z.object({
  hostName: usernameSchema.optional(),
});

export const gameRoomSchema = z.object({
  roomCode: roomCodeSchema,
});

export const answerSchema = z.object({
  roomCode: roomCodeSchema,
  questionId: z.string().min(1),
  selectedOption: z.enum(["A", "B", "C", "D"]),
  responseTimeMs: z.number().int().min(0).max(120_000),
});
