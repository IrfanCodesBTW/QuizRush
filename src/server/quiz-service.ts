import { customAlphabet, nanoid } from "nanoid";
import { demoQuiz, answerOptions } from "@/lib/demo-quiz";
import type {
  AchievementType,
  AgentInsight,
  AnswerDistribution,
  AnswerOption,
  LeaderboardEntry,
  Player,
  PlayerAnswer,
  Room,
  RoomEvent,
  RoomEventType,
  RoomSnapshot,
  ValkeyPrimitive,
} from "@/types/quiz";
import { buildAnalyticsInsight } from "@/server/agents/analytics-agent";
import { buildEngagementInsight, detectAchievements } from "@/server/agents/engagement-agent";
import { buildGameInsight } from "@/server/agents/game-orchestrator";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { getValkeyStore } from "@/server/valkey/store";
import { NotFoundError } from "@/server/http/errors";
import { getDeploymentReadiness } from "@/server/config/env";
import {
  playerKey,
  roomChannel,
  roomDistributionKey,
  roomEventsKey,
  roomKey,
  roomLeaderboardKey,
  roomPlayerAnswerKey,
  roomPlayersKey,
  roomScopedKeys,
  roomSubmissionsKey,
  userEmailKey,
} from "@/server/valkey/keys";

const roomCodeAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);
const roomTtlSeconds = Number(process.env.ROOM_TTL_SECONDS ?? 7200);

const adjectives = ["Cosmic", "Neon", "Pixel", "Turbo", "Sunny", "Orbit", "Lucky", "Rapid"];
const nouns = ["Tiger", "Falcon", "Wizard", "Comet", "Panda", "Rocket", "Sprite", "Ninja"];
const avatars = ["QZ", "VR", "XP", "DU", "MI", "GO", "AI", "KV"];

function nowIso() {
  return new Date().toISOString();
}

function ttlExpiryIso() {
  return new Date(Date.now() + roomTtlSeconds * 1000).toISOString();
}

function numberFromHash(value: string | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function randomUsername() {
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${
    nouns[Math.floor(Math.random() * nouns.length)]
  }${Math.floor(Math.random() * 90) + 10}`;
}

function randomAvatar() {
  return avatars[Math.floor(Math.random() * avatars.length)];
}

function parsePlayer(hash: Record<string, string>): Player {
  return {
    id: hash.id,
    username: hash.username,
    avatar: hash.avatar || "QR",
    score: numberFromHash(hash.score),
    streak: numberFromHash(hash.streak),
    isGuest: hash.isGuest === "true",
    isSpectator: hash.isSpectator === "true",
    joinedAt: hash.joinedAt,
    roomCode: hash.roomCode,
  };
}

function parseRoom(hash: Record<string, string>): Room | null {
  if (!hash.code || !hash.hostId) {
    return null;
  }

  return {
    code: hash.code,
    hostId: hash.hostId,
    status: (hash.status as Room["status"]) ?? "lobby",
    isPaused: hash.isPaused === "true",
    isLocked: hash.isLocked === "true",
    createdAt: hash.createdAt,
    updatedAt: hash.updatedAt,
    currentQuestionIndex: numberFromHash(hash.currentQuestionIndex),
    questionStartedAt: hash.questionStartedAt,
    questionEndsAt: hash.questionEndsAt,
    ttlExpiresAt: hash.ttlExpiresAt,
  };
}

function serializeEvent(event: Omit<RoomEvent, "id">) {
  return {
    roomCode: event.roomCode,
    type: event.type,
    primitive: event.primitive,
    actorId: event.actorId ?? "",
    message: event.message,
    payload: JSON.stringify(event.payload),
    createdAt: event.createdAt,
  };
}

function deserializeEvent(id: string, fields: Record<string, string>): RoomEvent {
  return {
    id,
    roomCode: fields.roomCode,
    type: fields.type as RoomEventType,
    primitive: fields.primitive as ValkeyPrimitive,
    actorId: fields.actorId || undefined,
    message: fields.message,
    payload: fields.payload ? (JSON.parse(fields.payload) as Record<string, unknown>) : {},
    createdAt: fields.createdAt,
  };
}

async function appendRoomEvent(args: {
  roomCode: string;
  type: RoomEventType;
  primitive: ValkeyPrimitive;
  message: string;
  actorId?: string;
  payload?: Record<string, unknown>;
}) {
  const valkey = getValkeyStore();
  const eventWithoutId = {
    roomCode: args.roomCode,
    type: args.type,
    primitive: args.primitive,
    actorId: args.actorId,
    message: args.message,
    payload: args.payload ?? {},
    createdAt: nowIso(),
  };
  const id = await valkey.xadd(roomEventsKey(args.roomCode), serializeEvent(eventWithoutId));
  const event: RoomEvent = { id, ...eventWithoutId };
  await valkey.publish(roomChannel(args.roomCode), JSON.stringify(event));

  // Mirror event globally for host dashboard activity feed
  try {
    await valkey.xadd("quizrush:global:events", serializeEvent(eventWithoutId));
    await valkey.publish("quizrush:global:channel", JSON.stringify(event));
  } catch (err) {
    console.warn("[QuizRush] Failed to publish global event:", err);
  }

  return event;
}

async function refreshRoomTtl(roomCode: string) {
  const valkey = getValkeyStore();
  await Promise.all(roomScopedKeys(roomCode, demoQuiz.length).map((key) => valkey.expire(key, roomTtlSeconds)));
  const playerIds = await valkey.smembers(roomPlayersKey(roomCode));
  await Promise.all(playerIds.map((id) => valkey.expire(playerKey(id), roomTtlSeconds)));
}

async function requireRoom(roomCode: string) {
  const room = parseRoom(await getValkeyStore().hgetall(roomKey(roomCode)));
  if (!room) {
    throw new NotFoundError("Room not found or expired.");
  }
  return room;
}

async function getPlayers(roomCode: string) {
  const valkey = getValkeyStore();
  const playerIds = await valkey.smembers(roomPlayersKey(roomCode));
  const players = await Promise.all(
    playerIds.map(async (id) => {
      const hash = await valkey.hgetall(playerKey(id));
      return hash.id ? parsePlayer(hash) : null;
    }),
  );

  return players.filter((player): player is Player => Boolean(player));
}

async function getAnswerDistribution(roomCode: string, questionIndex: number): Promise<AnswerDistribution | null> {
  const question = demoQuiz[questionIndex];
  if (!question) {
    return null;
  }

  const hash = await getValkeyStore().hgetall(roomDistributionKey(roomCode, questionIndex));
  const counts = answerOptions.map((option) => ({
    option,
    count: numberFromHash(hash[option]),
  }));
  const totalAnswers = counts.reduce((total, item) => total + item.count, 0);

  return {
    questionId: question.id,
    totalAnswers,
    options: counts.map((item) => ({
      option: item.option,
      label: question.options[item.option],
      count: item.count,
      percentage: totalAnswers === 0 ? 0 : Math.round((item.count / totalAnswers) * 100),
      isCorrect: item.option === question.correctAnswer,
    })),
  };
}

async function getLeaderboard(roomCode: string): Promise<LeaderboardEntry[]> {
  const valkey = getValkeyStore();
  const rows = await valkey.zrevrangeWithScores(roomLeaderboardKey(roomCode), 0, -1);
  const entries = await Promise.all(
    rows.map(async (row, index) => {
      const player = parsePlayer(await valkey.hgetall(playerKey(row.member)));
      return {
        ...player,
        score: row.score,
        rank: index + 1,
        movement: index === rows.length - 1 ? "new" : "same",
      } satisfies LeaderboardEntry;
    }),
  );

  return entries;
}

async function getEvents(roomCode: string) {
  const rows = await getValkeyStore().xrevrange(roomEventsKey(roomCode), 40);
  return rows.map((row) => deserializeEvent(row.id, row.fields));
}

function scoreAnswer(args: {
  correct: boolean;
  responseTimeMs: number;
  durationMs: number;
  streak: number;
}) {
  if (!args.correct) {
    return 0;
  }

  const speedRatio = Math.max(0, args.durationMs - args.responseTimeMs) / args.durationMs;
  return 500 + Math.round(speedRatio * 400) + Math.min(args.streak, 5) * 50;
}

export async function createGuestPlayer(username?: string) {
  const valkey = getValkeyStore();
  const player: Player = {
    id: `pl_${nanoid(10)}`,
    username: username || randomUsername(),
    avatar: randomAvatar(),
    score: 0,
    streak: 0,
    isGuest: true,
    joinedAt: nowIso(),
  };

  await valkey.hset(playerKey(player.id), player);
  return player;
}

export async function registerPlayer(args: { email: string; password: string; username?: string }) {
  const valkey = getValkeyStore();
  let playerId = `pl_${nanoid(10)}`;
  let username = args.username || args.email.split("@")[0];
  let isDbActive = false;

  try {
    const { findUserByEmail, createUser } = await import("@/server/db/postgres");
    const existing = await findUserByEmail(args.email);
    if (existing) {
      throw new Error("Email is already registered.");
    }
    const hashedPassword = await hashPassword(args.password);
    const dbUser = await createUser(playerId, args.email, username, hashedPassword);
    if (dbUser) {
      isDbActive = true;
      playerId = dbUser.id;
      username = dbUser.username;
    }
  } catch (err) {
    if (err instanceof Error && err.message === "Email is already registered.") {
      throw err;
    }
    console.warn("[Postgres] Registration skipped/failed, fallback to Valkey cache:", err);
  }

  if (!isDbActive) {
    const existingValkey = await valkey.hgetall(userEmailKey(args.email));
    if (existingValkey.playerId) {
      throw new Error("Email is already registered.");
    }
  }

  const player: Player = {
    id: playerId,
    username,
    avatar: randomAvatar(),
    score: 0,
    streak: 0,
    isGuest: false,
    joinedAt: nowIso(),
  };

  await valkey.hset(playerKey(player.id), player);
  if (!isDbActive) {
    await valkey.hset(userEmailKey(args.email), {
      email: args.email.toLowerCase(),
      playerId: player.id,
      passwordHash: await hashPassword(args.password),
    });
  }

  return player;
}

export async function loginPlayer(args: { email: string; password: string }) {
  const valkey = getValkeyStore();

  try {
    const { findUserByEmail } = await import("@/server/db/postgres");
    const dbUser = await findUserByEmail(args.email);
    if (dbUser) {
      const valid = await verifyPassword(args.password, dbUser.passwordHash);
      if (!valid) {
        throw new Error("Invalid email or password.");
      }
      let player = parsePlayer(await valkey.hgetall(playerKey(dbUser.id)));
      if (!player.id) {
        player = {
          id: dbUser.id,
          username: dbUser.username,
          avatar: randomAvatar(),
          score: 0,
          streak: 0,
          isGuest: false,
          joinedAt: nowIso(),
        };
        await valkey.hset(playerKey(player.id), player);
      }
      return player;
    }
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid email or password.") {
      throw err;
    }
    console.warn("[Postgres] Login query issue, fallback to Valkey checks.");
  }

  const user = await valkey.hgetall(userEmailKey(args.email));
  if (!user.playerId || !user.passwordHash) {
    throw new Error("Invalid email or password.");
  }

  const valid = await verifyPassword(args.password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password.");
  }

  return parsePlayer(await valkey.hgetall(playerKey(user.playerId)));
}

export async function createRoom(hostId: string) {
  const valkey = getValkeyStore();
  const host = parsePlayer(await valkey.hgetall(playerKey(hostId)));
  const roomCode = `QR-${roomCodeAlphabet()}`;
  const timestamp = nowIso();
  const room: Room = {
    code: roomCode,
    hostId,
    status: "lobby",
    createdAt: timestamp,
    updatedAt: timestamp,
    currentQuestionIndex: 0,
    ttlExpiresAt: ttlExpiryIso(),
  };

  await valkey.hset(roomKey(roomCode), room);
  await valkey.sadd(roomPlayersKey(roomCode), hostId);
  await valkey.hset(playerKey(hostId), { roomCode, score: 0, streak: 0 });
  await valkey.zadd(roomLeaderboardKey(roomCode), 0, hostId);
  await refreshRoomTtl(roomCode);
  await appendRoomEvent({
    roomCode,
    type: "room.created",
    primitive: "TTL",
    actorId: hostId,
    message: `${host.username} created ${roomCode}; room TTL set to ${Math.round(roomTtlSeconds / 60)} minutes.`,
    payload: { roomCode, ttlSeconds: roomTtlSeconds },
  });
  await appendRoomEvent({
    roomCode,
    type: "player.joined",
    primitive: "Set",
    actorId: hostId,
    message: `${host.username} joined as host.`,
    payload: { playerId: hostId },
  });

  return getRoomSnapshot(roomCode);
}

export async function joinRoom(roomCode: string, playerId: string) {
  const valkey = getValkeyStore();
  const room = await requireRoom(roomCode);
  const player = parsePlayer(await valkey.hgetall(playerKey(playerId)));

  if (player.roomCode !== roomCode) {
    if (room.isLocked) {
      throw new Error("The host has locked this room.");
    }
    const isSpectatorJoin = room.status === "live" || room.status === "reveal";
    if (room.status !== "lobby" && !isSpectatorJoin) {
      throw new Error("This room is already in progress.");
    }

    if (isSpectatorJoin) {
      await valkey.hset(playerKey(playerId), { roomCode, score: 0, streak: 0, isSpectator: "true" });
    } else {
      await valkey.hset(playerKey(playerId), { roomCode, score: 0, streak: 0 });
      await valkey.zadd(roomLeaderboardKey(roomCode), 0, playerId);
    }
  }

  await valkey.sadd(roomPlayersKey(roomCode), playerId);
  await refreshRoomTtl(roomCode);

  if (player.roomCode !== roomCode) {
    const isSpectatorJoin = room.status === "live" || room.status === "reveal";
    await appendRoomEvent({
      roomCode,
      type: "player.joined",
      primitive: "Set",
      actorId: playerId,
      message: `${player.username} joined the arena.`,
      payload: { playerId, isSpectator: isSpectatorJoin },
    });
  }

  return getRoomSnapshot(roomCode);
}

export async function leaveRoom(roomCode: string, playerId: string) {
  const valkey = getValkeyStore();
  const player = parsePlayer(await valkey.hgetall(playerKey(playerId)));
  await valkey.srem(roomPlayersKey(roomCode), playerId);
  await valkey.hset(playerKey(playerId), { roomCode: "" });
  await refreshRoomTtl(roomCode);
  await appendRoomEvent({
    roomCode,
    type: "player.left",
    primitive: "Set",
    actorId: playerId,
    message: `${player.username} left the room.`,
    payload: { playerId },
  });
}

export async function kickPlayer(roomCode: string, playerId: string, hostId: string) {
  const valkey = getValkeyStore();
  const room = await requireRoom(roomCode);
  if (room.hostId !== hostId) {
    throw new Error("Only the host can kick players.");
  }
  const player = parsePlayer(await valkey.hgetall(playerKey(playerId)));
  await valkey.srem(roomPlayersKey(roomCode), playerId);
  await valkey.hset(playerKey(playerId), { roomCode: "" });
  await refreshRoomTtl(roomCode);
  await appendRoomEvent({
    roomCode,
    type: "player.kicked",
    primitive: "Set",
    actorId: hostId,
    message: `${player.username} was kicked by the host.`,
    payload: { playerId },
  });
}

export async function pauseGame(roomCode: string, hostId: string) {
  const valkey = getValkeyStore();
  const room = await requireRoom(roomCode);
  if (room.hostId !== hostId) {
    throw new Error("Only the host can pause the game.");
  }
  if (room.status !== "live") {
    throw new Error("Can only pause a live game.");
  }

  // Adjust remaining time calculation if we want, but basically just set isPaused
  room.isPaused = true;
  await valkey.hset(roomKey(roomCode), room);
  await appendRoomEvent({
    roomCode,
    type: "game.paused",
    primitive: "Hash",
    actorId: hostId,
    message: "Game was paused by the host.",
    payload: {},
  });
}

export async function resumeGame(roomCode: string, hostId: string) {
  const valkey = getValkeyStore();
  const room = await requireRoom(roomCode);
  if (room.hostId !== hostId) {
    throw new Error("Only the host can resume the game.");
  }
  if (room.status !== "live") {
    throw new Error("Can only resume a live game.");
  }
  if (!room.isPaused) {
    return;
  }

  room.isPaused = false;
  // NOTE: If we want the timer to accurately resume, we would shift questionStartedAt and questionEndsAt here.
  // For simplicity, we just clear the pause state so clients can continue.
  await valkey.hset(roomKey(roomCode), room);
  await appendRoomEvent({
    roomCode,
    type: "game.resumed",
    primitive: "Hash",
    actorId: hostId,
    message: "Game was resumed by the host.",
    payload: {},
  });
}

export async function lockRoom(roomCode: string, hostId: string) {
  const valkey = getValkeyStore();
  const room = await requireRoom(roomCode);
  if (room.hostId !== hostId) {
    throw new Error("Only the host can lock the room.");
  }
  if (room.isLocked) {
    return;
  }

  room.isLocked = true;
  await valkey.hset(roomKey(roomCode), room);
  await appendRoomEvent({
    roomCode,
    type: "room.locked",
    primitive: "Hash",
    actorId: hostId,
    message: "Room was locked by the host.",
    payload: {},
  });
}

export async function unlockRoom(roomCode: string, hostId: string) {
  const valkey = getValkeyStore();
  const room = await requireRoom(roomCode);
  if (room.hostId !== hostId) {
    throw new Error("Only the host can unlock the room.");
  }
  if (!room.isLocked) {
    return;
  }

  room.isLocked = false;
  await valkey.hset(roomKey(roomCode), room);
  await appendRoomEvent({
    roomCode,
    type: "room.unlocked",
    primitive: "Hash",
    actorId: hostId,
    message: "Room was unlocked by the host.",
    payload: {},
  });
}

export async function startGame(roomCode: string, hostId: string) {
  const valkey = getValkeyStore();
  const room = await requireRoom(roomCode);
  if (room.hostId !== hostId) {
    throw new Error("Only the host can start this game.");
  }

  const question = demoQuiz[0];
  const startedAt = Date.now();
  await valkey.hset(roomKey(roomCode), {
    status: "live",
    currentQuestionIndex: 0,
    questionStartedAt: new Date(startedAt).toISOString(),
    questionEndsAt: new Date(startedAt + question.durationMs).toISOString(),
    updatedAt: nowIso(),
    ttlExpiresAt: ttlExpiryIso(),
  });
  await refreshRoomTtl(roomCode);
  await appendRoomEvent({
    roomCode,
    type: "game.started",
    primitive: "Pub/Sub",
    actorId: hostId,
    message: "Game started; first question broadcast to all players.",
    payload: { totalQuestions: demoQuiz.length },
  });
  await appendRoomEvent({
    roomCode,
    type: "question.started",
    primitive: "Pub/Sub",
    actorId: hostId,
    message: `Question 1 is live: ${question.prompt}`,
    payload: { questionId: question.id, durationMs: question.durationMs },
  });

  return getRoomSnapshot(roomCode);
}

export async function advanceGame(roomCode: string, hostId: string) {
  const valkey = getValkeyStore();
  const room = await requireRoom(roomCode);
  if (room.hostId !== hostId) {
    throw new Error("Only the host can advance this game.");
  }

  const nextIndex = room.currentQuestionIndex + 1;
  if (nextIndex >= demoQuiz.length) {
    await valkey.hset(roomKey(roomCode), {
      status: "ended",
      updatedAt: nowIso(),
      ttlExpiresAt: ttlExpiryIso(),
    });
    await refreshRoomTtl(roomCode);

    try {
      const players = await getPlayers(roomCode);
      for (const p of players) {
        if (!p.isGuest) {
          try {
            const { saveQuizHistory } = await import("@/server/db/postgres");
            let correctAnswers = 0;
            for (let qIndex = 0; qIndex < demoQuiz.length; qIndex++) {
              const ansHash = await valkey.hgetall(roomPlayerAnswerKey(roomCode, qIndex, p.id));
              if (ansHash.correct === "true") {
                correctAnswers++;
              }
            }
            await saveQuizHistory(p.id, roomCode, p.score, p.streak, correctAnswers, demoQuiz.length);
          } catch (dbErr) {
            console.warn("[Postgres] Failed to write quiz history for player:", p.id, dbErr);
          }
        }
      }
    } catch (err) {
      console.warn("[Postgres] Failed to fetch players or save history:", err);
    }

    const top = (await getLeaderboard(roomCode))[0];
    if (top) {
      await appendRoomEvent({
        roomCode,
        type: "achievement.unlocked",
        primitive: "Stream",
        actorId: top.id,
        message: `${top.username} unlocked Quiz Champion.`,
        payload: { achievement: "Quiz Champion" satisfies AchievementType },
      });
    }
    await appendRoomEvent({
      roomCode,
      type: "game.ended",
      primitive: "Stream",
      actorId: hostId,
      message: "Game ended; final results persisted to the event stream.",
      payload: { winnerId: top?.id },
    });
    return getRoomSnapshot(roomCode);
  }

  const question = demoQuiz[nextIndex];
  const startedAt = Date.now();
  await valkey.hset(roomKey(roomCode), {
    status: "live",
    currentQuestionIndex: nextIndex,
    questionStartedAt: new Date(startedAt).toISOString(),
    questionEndsAt: new Date(startedAt + question.durationMs).toISOString(),
    updatedAt: nowIso(),
    ttlExpiresAt: ttlExpiryIso(),
  });
  await refreshRoomTtl(roomCode);
  await appendRoomEvent({
    roomCode,
    type: "question.started",
    primitive: "Pub/Sub",
    actorId: hostId,
    message: `Question ${nextIndex + 1} is live: ${question.prompt}`,
    payload: { questionId: question.id, durationMs: question.durationMs },
  });

  return getRoomSnapshot(roomCode);
}

export async function revealQuestion(roomCode: string, hostId: string) {
  const valkey = getValkeyStore();
  const room = await requireRoom(roomCode);
  if (room.hostId !== hostId) {
    throw new Error("Only the host can reveal this question.");
  }

  await valkey.hset(roomKey(roomCode), {
    status: "reveal",
    updatedAt: nowIso(),
    ttlExpiresAt: ttlExpiryIso(),
  });
  await refreshRoomTtl(roomCode);
  await appendRoomEvent({
    roomCode,
    type: "answer.distribution.updated",
    primitive: "Hash",
    actorId: hostId,
    message: "Answer distribution revealed from Valkey hash counters.",
    payload: { questionIndex: room.currentQuestionIndex },
  });
  return getRoomSnapshot(roomCode);
}

export async function submitAnswer(args: {
  roomCode: string;
  playerId: string;
  questionId: string;
  selectedOption: AnswerOption;
  responseTimeMs: number;
}) {
  const valkey = getValkeyStore();
  const room = await requireRoom(args.roomCode);
  const question = demoQuiz[room.currentQuestionIndex];
  if (!question || question.id !== args.questionId) {
    throw new Error("Question is no longer active.");
  }
  if (room.status !== "live") {
    throw new Error("Answers are locked for this question.");
  }
  if (room.questionEndsAt && Date.now() > new Date(room.questionEndsAt).getTime()) {
    throw new Error("Timer expired before this answer reached the server.");
  }

  const accepted = await valkey.sadd(roomSubmissionsKey(args.roomCode, room.currentQuestionIndex), args.playerId);
  if (accepted === 0) {
    throw new Error("You already answered this question.");
  }

  const playerBefore = parsePlayer(await valkey.hgetall(playerKey(args.playerId)));
  const correct = args.selectedOption === question.correctAnswer;
  const nextStreak = correct ? playerBefore.streak + 1 : 0;
  const scoreAwarded = scoreAnswer({
    correct,
    responseTimeMs: args.responseTimeMs,
    durationMs: question.durationMs,
    streak: nextStreak,
  });

  await valkey.hset(roomPlayerAnswerKey(args.roomCode, room.currentQuestionIndex, args.playerId), {
    playerId: args.playerId,
    questionId: args.questionId,
    selectedOption: args.selectedOption,
    responseTimeMs: args.responseTimeMs,
    correct,
    scoreAwarded,
    answeredAt: nowIso(),
  });
  await valkey.hincrby(roomDistributionKey(args.roomCode, room.currentQuestionIndex), args.selectedOption, 1);
  await valkey.hset(playerKey(args.playerId), { streak: nextStreak });
  if (scoreAwarded > 0) {
    await valkey.hincrby(playerKey(args.playerId), "score", scoreAwarded);
    await valkey.zincrby(roomLeaderboardKey(args.roomCode), scoreAwarded, args.playerId);
  }
  await refreshRoomTtl(args.roomCode);

  const leaderboard = await getLeaderboard(args.roomCode);
  const playerAfter = parsePlayer(await valkey.hgetall(playerKey(args.playerId)));
  const isTopPlayer = leaderboard[0]?.id === args.playerId;
  const achievements = detectAchievements({
    player: playerAfter,
    correct,
    responseTimeMs: args.responseTimeMs,
    isTopPlayer,
  });

  await appendRoomEvent({
    roomCode: args.roomCode,
    type: "answer.submitted",
    primitive: "Atomic Update",
    actorId: args.playerId,
    message: `${playerBefore.username} answered ${args.selectedOption}${correct ? " correctly" : ""} for +${scoreAwarded}.`,
    payload: {
      questionId: args.questionId,
      selectedOption: args.selectedOption,
      correct,
      scoreAwarded,
      responseTimeMs: args.responseTimeMs,
    },
  });
  await appendRoomEvent({
    roomCode: args.roomCode,
    type: "leaderboard.updated",
    primitive: "Sorted Set",
    actorId: args.playerId,
    message: "Leaderboard score updated through a Valkey Sorted Set.",
    payload: { playerId: args.playerId, scoreAwarded },
  });

  for (const achievement of achievements) {
    await appendRoomEvent({
      roomCode: args.roomCode,
      type: "achievement.unlocked",
      primitive: "Stream",
      actorId: args.playerId,
      message: `${playerBefore.username} unlocked ${achievement}.`,
      payload: { achievement },
    });
  }

  return getRoomSnapshot(args.roomCode);
}

export async function getRoomSnapshot(roomCode: string): Promise<RoomSnapshot> {
  const room = await requireRoom(roomCode);
  const [players, leaderboard, events] = await Promise.all([
    getPlayers(roomCode),
    getLeaderboard(roomCode),
    getEvents(roomCode),
  ]);
  const rawCurrentQuestion = demoQuiz[room.currentQuestionIndex] ?? null;
  const currentQuestion = rawCurrentQuestion
    ? {
        id: rawCurrentQuestion.id,
        prompt: rawCurrentQuestion.prompt,
        options: rawCurrentQuestion.options,
        durationMs: rawCurrentQuestion.durationMs,
      }
    : null;
  const answerDistribution = currentQuestion
    ? await getAnswerDistribution(roomCode, room.currentQuestionIndex)
    : null;
  const latestAchievement = events.find((event) => event.type === "achievement.unlocked")?.payload
    .achievement as AchievementType | undefined;
  const insights: AgentInsight[] = [
    buildGameInsight(room),
    buildAnalyticsInsight(answerDistribution, rawCurrentQuestion),
    buildEngagementInsight(latestAchievement),
  ];

  const valkey = getValkeyStore();
  const playerAnswers: Record<string, PlayerAnswer[]> = {};

  await Promise.all(
    players.map(async (p) => {
      const answers = await Promise.all(
        demoQuiz.map(async (question, questionIndex) => {
          const ansHash = await valkey.hgetall(roomPlayerAnswerKey(roomCode, questionIndex, p.id));
          if (!ansHash.playerId) return null;
          return {
            playerId: ansHash.playerId,
            questionId: ansHash.questionId,
            selectedOption: ansHash.selectedOption as AnswerOption,
            responseTimeMs: numberFromHash(ansHash.responseTimeMs),
            correct: ansHash.correct === "true",
            scoreAwarded: numberFromHash(ansHash.scoreAwarded),
            answeredAt: ansHash.answeredAt,
          } satisfies PlayerAnswer;
        })
      );
      playerAnswers[p.id] = answers.filter((a): a is PlayerAnswer => a !== null);
    })
  );

  return {
    room,
    players,
    leaderboard,
    events,
    currentQuestion,
    answerDistribution,
    insights,
    serverNow: nowIso(),
    playerAnswers,
  };
}

export async function getRuntimeStatus() {
  const { checkConnection } = await import("@/server/db/postgres");
  const isPostgresConnected = await checkConnection();

  return {
    valkeyMode: getValkeyStore().mode,
    postgresMode: isPostgresConnected ? "connected" : "fallback",
    ttlSeconds: roomTtlSeconds,
    primitives: ["Hash", "Set", "Sorted Set", "Stream", "Pub/Sub", "TTL", "Atomic Update"],
    readiness: getDeploymentReadiness(),
  };
}

export async function getActiveRooms() {
  const valkey = getValkeyStore();
  const roomKeys = await valkey.keys("room:QR-*");
  const mainRoomKeys = roomKeys.filter((k) => k.split(":").length === 2);
  
  const roomsData = await Promise.all(
    mainRoomKeys.map(async (key) => {
      const hash = await valkey.hgetall(key);
      const room = parseRoom(hash);
      if (!room) return null;
      
      const players = await getPlayers(room.code);
      return {
        code: room.code,
        hostId: room.hostId,
        status: room.status,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        currentQuestionIndex: room.currentQuestionIndex,
        playersCount: players.length,
        totalQuestions: demoQuiz.length,
      };
    })
  );
  
  return roomsData.filter((r): r is NonNullable<typeof r> => r !== null);
}

export async function getGlobalEvents() {
  const valkey = getValkeyStore();
  try {
    const rows = await valkey.xrevrange("quizrush:global:events", 30);
    return rows.map((row) => deserializeEvent(row.id, row.fields));
  } catch (err) {
    console.warn("[QuizRush] Failed to fetch global events:", err);
    return [];
  }
}

export async function endGame(roomCode: string, hostId: string) {
  const valkey = getValkeyStore();
  const room = await requireRoom(roomCode);
  if (room.hostId !== hostId) {
    throw new Error("Only the host can end this game.");
  }
  
  await valkey.hset(roomKey(roomCode), {
    status: "ended",
    updatedAt: nowIso(),
    ttlExpiresAt: ttlExpiryIso(),
  });
  await refreshRoomTtl(roomCode);
  
  try {
    const players = await getPlayers(roomCode);
    
    // Save host room history first
    try {
      const { saveRoomHistory } = await import("@/server/db/postgres");
      const finalLeaderboard = await getLeaderboard(roomCode);
      await saveRoomHistory(hostId, roomCode, finalLeaderboard, demoQuiz);
    } catch (hostDbErr) {
      console.warn("[Postgres] Failed to write room history for host:", hostId, hostDbErr);
    }

    for (const p of players) {
      if (!p.isGuest) {
        try {
          const { saveQuizHistory } = await import("@/server/db/postgres");
          let correctAnswers = 0;
          for (let qIndex = 0; qIndex < demoQuiz.length; qIndex++) {
            const ansHash = await valkey.hgetall(roomPlayerAnswerKey(roomCode, qIndex, p.id));
            if (ansHash.correct === "true") {
              correctAnswers++;
            }
          }
          await saveQuizHistory(p.id, roomCode, p.score, p.streak, correctAnswers, demoQuiz.length);
        } catch (dbErr) {
          console.warn("[Postgres] Failed to write quiz history for player:", p.id, dbErr);
        }
      }
    }
  } catch (err) {
    console.warn("[Postgres] Failed to fetch players or save history:", err);
  }

  const top = (await getLeaderboard(roomCode))[0];
  if (top) {
    await appendRoomEvent({
      roomCode,
      type: "achievement.unlocked",
      primitive: "Stream",
      actorId: top.id,
      message: `${top.username} unlocked Quiz Champion.`,
      payload: { achievement: "Quiz Champion" },
    });
  }
  await appendRoomEvent({
    roomCode,
    type: "game.ended",
    primitive: "Stream",
    actorId: hostId,
    message: "Game ended by host; results persisted.",
    payload: { winnerId: top?.id },
  });
  
  return getRoomSnapshot(roomCode);
}

export const quizInternals = {
  scoreAnswer,
};
