import type { AgentInsight, AnswerDistribution, QuizQuestion } from "@/types/quiz";

export function buildAnalyticsInsight(
  distribution: AnswerDistribution | null,
  question: QuizQuestion | null,
): AgentInsight {
  if (!distribution || !question || distribution.totalAnswers === 0) {
    return {
      agent: "Analytics Agent",
      tone: "insight",
      message: "Waiting for answer signals before generating a room insight.",
    };
  }

  const correct = distribution.options.find((option) => option.isCorrect);
  const strongest = [...distribution.options].sort((a, b) => b.count - a.count)[0];

  if (correct && correct.count === strongest.count) {
    return {
      agent: "Analytics Agent",
      tone: "insight",
      message: `${correct.percentage}% selected ${correct.option}, showing strong understanding of ${question.prompt.toLowerCase()}`,
    };
  }

  return {
    agent: "Analytics Agent",
    tone: "insight",
    message: `${strongest.percentage}% leaned toward ${strongest.option}; reveal creates a sharp teaching moment around ${question.correctAnswer}.`,
  };
}
