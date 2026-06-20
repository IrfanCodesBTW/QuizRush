export type GameStatus = "lobby" | "live" | "reveal" | "ended";

export type AnswerOption = "A" | "B" | "C" | "D";

export type ValkeyPrimitive =
  | "Hash"
  | "Set"
  | "Sorted Set"
  | "Stream"
  | "Pub/Sub"
  | "TTL"
  | "Atomic Update";

export type RoomEventType =
  | "room.created"
  | "player.joined"
  | "player.left"
  | "player.kicked"
  | "game.started"
  | "game.paused"
  | "game.resumed"
  | "question.started"
  | "answer.submitted"
  | "answer.distribution.updated"
  | "leaderboard.updated"
  | "achievement.unlocked"
  | "game.ended"
  | "room.locked"
  | "room.unlocked";

export type AchievementType =
  | "Fast Thinker"
  | "Perfect Round"
  | "Streak Master"
  | "Top Performer"
  | "Quiz Champion";

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: Record<AnswerOption, string>;
  correctAnswer: AnswerOption;
  explanation: string;
  durationMs: number;
}

export type ClientQuizQuestion = Omit<QuizQuestion, "correctAnswer" | "explanation">;

export interface Player {
  id: string;
  username: string;
  avatar: string;
  score: number;
  streak: number;
  isGuest: boolean;
  joinedAt: string;
  roomCode?: string;
}

export interface LeaderboardEntry extends Player {
  rank: number;
  movement: "up" | "down" | "same" | "new";
}

export interface AnswerDistribution {
  questionId: string;
  totalAnswers: number;
  options: Array<{
    option: AnswerOption;
    label: string;
    count: number;
    percentage: number;
    isCorrect: boolean;
  }>;
}

export interface Room {
  code: string;
  hostId: string;
  status: GameStatus;
  isPaused?: boolean;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
  currentQuestionIndex: number;
  questionStartedAt?: string;
  questionEndsAt?: string;
  ttlExpiresAt: string;
}

export interface RoomEvent {
  id: string;
  roomCode: string;
  type: RoomEventType;
  primitive: ValkeyPrimitive;
  actorId?: string;
  message: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AgentInsight {
  agent: "Game Orchestrator" | "Analytics Agent" | "Engagement Agent";
  tone: "operational" | "insight" | "celebration";
  message: string;
}

export interface PlayerAnswer {
  playerId: string;
  questionId: string;
  selectedOption: AnswerOption;
  responseTimeMs: number;
  correct: boolean;
  scoreAwarded: number;
  answeredAt: string;
}

export interface RoomSnapshot {
  room: Room;
  players: Player[];
  leaderboard: LeaderboardEntry[];
  events: RoomEvent[];
  currentQuestion: ClientQuizQuestion | null;
  answerDistribution: AnswerDistribution | null;
  insights: AgentInsight[];
  serverNow: string;
  playerAnswers?: Record<string, PlayerAnswer[]>;
}

