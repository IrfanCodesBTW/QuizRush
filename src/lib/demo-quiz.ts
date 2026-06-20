import type { QuizQuestion } from "@/types/quiz";

export const demoQuiz: QuizQuestion[] = [
  {
    id: "q-valkey-1",
    prompt: "Which Valkey primitive is best for live leaderboard ranking?",
    options: {
      A: "Streams",
      B: "Sorted Sets",
      C: "Hashes",
      D: "Pub/Sub",
    },
    correctAnswer: "B",
    explanation: "Sorted Sets keep player scores ordered and make rank lookups fast.",
    durationMs: 20_000,
  },
  {
    id: "q-valkey-2",
    prompt: "What should QuizRush use to keep a replayable room activity history?",
    options: {
      A: "Streams",
      B: "Sets",
      C: "TTL only",
      D: "Client state",
    },
    correctAnswer: "A",
    explanation: "Streams provide append-only event history for joins, answers, ranks, and achievements.",
    durationMs: 20_000,
  },
  {
    id: "q-valkey-3",
    prompt: "Why does QuizRush use Pub/Sub during live gameplay?",
    options: {
      A: "To hash passwords",
      B: "To broadcast room events instantly",
      C: "To export PDFs",
      D: "To store static assets",
    },
    correctAnswer: "B",
    explanation: "Pub/Sub fans out live question, answer, and leaderboard changes to connected clients.",
    durationMs: 20_000,
  },
  {
    id: "q-valkey-4",
    prompt: "What does TTL protect in a hackathon demo room?",
    options: {
      A: "It prevents stale rooms from living forever",
      B: "It makes charts prettier",
      C: "It increases font weight",
      D: "It replaces authentication",
    },
    correctAnswer: "A",
    explanation: "TTL-based lifecycle management cleans inactive rooms without a manual cleanup job.",
    durationMs: 20_000,
  },
];

export const answerOptions = ["A", "B", "C", "D"] as const;
