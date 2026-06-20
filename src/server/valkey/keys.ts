export const roomKey = (roomCode: string) => `room:${roomCode}`;
export const roomPlayersKey = (roomCode: string) => `room:${roomCode}:players`;
export const roomLeaderboardKey = (roomCode: string) => `leaderboard:${roomCode}`;
export const roomEventsKey = (roomCode: string) => `room:${roomCode}:events`;
export const roomDistributionKey = (roomCode: string, questionIndex: number) =>
  `room:${roomCode}:answers:${questionIndex}:distribution`;
export const roomSubmissionsKey = (roomCode: string, questionIndex: number) =>
  `room:${roomCode}:answers:${questionIndex}:submissions`;
export const roomPlayerAnswerKey = (roomCode: string, questionIndex: number, playerId: string) =>
  `room:${roomCode}:answers:${questionIndex}:player:${playerId}`;
export const playerKey = (playerId: string) => `player:${playerId}`;
export const userEmailKey = (email: string) => `user:email:${email.toLowerCase()}`;
export const roomChannel = (roomCode: string) => `quizrush:room:${roomCode}`;
export const allRoomsPattern = "quizrush:room:*";

export const roomScopedKeys = (roomCode: string, totalQuestions: number) => {
  const keys = [
    roomKey(roomCode),
    roomPlayersKey(roomCode),
    roomLeaderboardKey(roomCode),
    roomEventsKey(roomCode),
  ];

  for (let index = 0; index < totalQuestions; index += 1) {
    keys.push(roomDistributionKey(roomCode, index));
    keys.push(roomSubmissionsKey(roomCode, index));
  }

  return keys;
};
