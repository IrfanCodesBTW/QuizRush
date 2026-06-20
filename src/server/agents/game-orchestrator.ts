import type { AgentInsight, Room } from "@/types/quiz";

export function buildGameInsight(room: Room): AgentInsight {
  if (room.status === "lobby") {
    return {
      agent: "Game Orchestrator",
      tone: "operational",
      message: "Lobby is live. The next host action broadcasts the first question through Pub/Sub.",
    };
  }

  if (room.status === "live") {
    return {
      agent: "Game Orchestrator",
      tone: "operational",
      message: "Question timer is authoritative on the server; late answers are rejected.",
    };
  }

  if (room.status === "reveal") {
    return {
      agent: "Game Orchestrator",
      tone: "operational",
      message: "Reveal window is open. Advance to the next question or end the game.",
    };
  }

  return {
    agent: "Game Orchestrator",
    tone: "operational",
    message: "Game ended. Results are ready for PDF export and winner reveal.",
  };
}
