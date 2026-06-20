import type { AchievementType, AgentInsight, Player } from "@/types/quiz";

export function detectAchievements(args: {
  player: Player;
  correct: boolean;
  responseTimeMs: number;
  isTopPlayer: boolean;
}) {
  const achievements: AchievementType[] = [];

  if (args.correct && args.responseTimeMs <= 3_000) {
    achievements.push("Fast Thinker");
  }

  if (args.correct && args.player.streak >= 3) {
    achievements.push("Streak Master");
  }

  if (args.isTopPlayer && args.correct) {
    achievements.push("Top Performer");
  }

  return achievements;
}

export function buildEngagementInsight(latestAchievement?: AchievementType): AgentInsight {
  return {
    agent: "Engagement Agent",
    tone: "celebration",
    message: latestAchievement
      ? `${latestAchievement} just fired. Keep the room energy high.`
      : "Celebrations are armed for streaks, fast answers, and leaderboard jumps.",
  };
}
