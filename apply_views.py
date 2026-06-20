import re

with open("src/features/quiz/components/quizrush-experience.tsx", "r", encoding="utf-8") as f:
    code = f.read()

def replace_block(marker, new_text):
    global code
    start_idx = code.find(marker)
    if start_idx == -1: return
    paren_idx = code.find('(', start_idx)
    count = 0
    end_idx = paren_idx
    for i in range(paren_idx, len(code)):
        if code[i] == '(': count += 1
        elif code[i] == ')': count -= 1
        if count == 0:
            end_idx = i
            break
    code = code[:paren_idx] + " ( " + new_text + " ) " + code[end_idx+1:]

replace_block('!currentPlayer ?', '<AuthView authMode={authMode} setAuthMode={setAuthMode} username={username} setUsername={setUsername} email={email} setEmail={setEmail} password={password} setPassword={setPassword} authenticate={authenticate} loading={loading} />')
replace_block('!snapshot ?', '<LobbyView currentPlayer={currentPlayer} createRoom={createRoom} joinRoom={joinRoom} loading={loading} roomInput={roomInput} setRoomInput={setRoomInput} />')
replace_block('activeTab === "play" &&', '<PlayView username={username} loading={loading} error={error} createRoom={createRoom} setRoomInput={setRoomInput} snapshot={snapshot} isHost={isHost} startGame={startGame} revealQuestion={revealQuestion} advanceGame={advanceGame} answer={answer} selected={selected} setSnapshot={setSnapshot} setActiveTab={setActiveTab} currentQuestion={currentQuestion} remainingMs={remainingMs} currentQuestionProgress={currentQuestionProgress} hasAnswered={hasAnswered} selectedForCurrentQuestion={selectedForCurrentQuestion} questionStartedAt={questionStartedAt} now={now} currentPlayer={currentPlayer} />')
replace_block('activeTab === "leagues" &&', '<LeaderboardView snapshot={snapshot} currentPlayer={currentPlayer} />')
replace_block('activeTab === "analytics" &&', '<AnalyticsView snapshot={snapshot} currentPlayer={currentPlayer} myAnswers={myAnswers} accuracyStats={accuracyStats} paceData={paceData} avgPace={avgPace} />')
replace_block('activeTab === "activity" &&', '<ActivityFeed snapshot={snapshot} runtime={runtime} displayedSocketState={displayedSocketState} roomCode={roomCode} formatRoomCode={formatRoomCode} />')

imports = """
import { AuthView } from "./views/AuthView";
import { LobbyView } from "./views/LobbyView";
import { PlayView } from "./views/PlayView";
import { LeaderboardView } from "./views/LeaderboardView";
import { AnalyticsView } from "./views/AnalyticsView";
import { ActivityFeed } from "./views/ActivityFeed";
"""
code = code.replace('import { GameEngine } from "@/components/game-engine";', 'import { GameEngine } from "@/components/game-engine";\n' + imports)

with open("src/features/quiz/components/quizrush-experience.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied replacements.")
