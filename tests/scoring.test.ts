import { describe, expect, it } from "vitest";
import { quizInternals } from "@/server/quiz-service";

describe("QuizRush scoring", () => {
  it("awards no points for incorrect answers", () => {
    expect(
      quizInternals.scoreAnswer({
        correct: false,
        responseTimeMs: 1000,
        durationMs: 20_000,
        streak: 4,
      }),
    ).toBe(0);
  });

  it("rewards speed and streaks for correct answers", () => {
    const slow = quizInternals.scoreAnswer({
      correct: true,
      responseTimeMs: 15_000,
      durationMs: 20_000,
      streak: 1,
    });
    const fast = quizInternals.scoreAnswer({
      correct: true,
      responseTimeMs: 2_000,
      durationMs: 20_000,
      streak: 3,
    });

    expect(fast).toBeGreaterThan(slow);
  });
});
