const fs = require('fs');
const lines = fs.readFileSync('src/features/quiz/components/quizrush-experience.tsx', 'utf8').split('\n');

function getBlock(startMarker, endMarker, offsetEnd = 0) {
  const start = lines.findIndex(l => l.includes(startMarker));
  const end = lines.findIndex((l, i) => i > start && l.includes(endMarker)) + offsetEnd;
  return { start, end, code: lines.slice(start, end).join('\n') };
}

const auth = getBlock('/* Authentication Screen */', '</motion.div>', 1);
const lobby = getBlock('/* Room Launcher Screen */', '</motion.div>', 1);
const play = getBlock('activeTab === "play"', ')}', 1);
const leagues = getBlock('activeTab === "leagues"', ')}', 1);
const analytics = getBlock('activeTab === "analytics"', ')}', 1);
const activity = getBlock('activeTab === "activity"', ')}', 1);

console.log('auth:', auth.start, auth.end);
console.log('lobby:', lobby.start, lobby.end);
console.log('play:', play.start, play.end);
console.log('leagues:', leagues.start, leagues.end);
console.log('analytics:', analytics.start, analytics.end);
console.log('activity:', activity.start, activity.end);
