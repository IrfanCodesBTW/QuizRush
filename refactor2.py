import re
import os

with open("src/features/quiz/components/quizrush-experience.tsx", "r", encoding="utf-8") as f:
    code = f.read()

def extract_jsx_block(start_marker):
    start_idx = code.find(start_marker)
    if start_idx == -1:
        return ""
    
    # find the first opening parenthesis after the marker
    paren_idx = code.find('(', start_idx)
    if paren_idx == -1:
        return ""
    
    # count brackets to find matching end parenthesis
    count = 0
    end_idx = paren_idx
    for i in range(paren_idx, len(code)):
        if code[i] == '(': count += 1
        elif code[i] == ')': count -= 1
        
        if count == 0:
            end_idx = i
            break
            
    # return the content INSIDE the parentheses
    return code[paren_idx+1:end_idx].strip()

# Auth and Lobby are inside `{cond ? (...) : cond ? (...) : (...)}`
auth_code = extract_jsx_block('!currentPlayer ?')
lobby_code = extract_jsx_block('!snapshot ?')
play_code = extract_jsx_block('activeTab === "play" &&')
leagues_code = extract_jsx_block('activeTab === "leagues" &&')
analytics_code = extract_jsx_block('activeTab === "analytics" &&')
activity_code = extract_jsx_block('activeTab === "activity" &&')

def write_view(name, content, imports, props_def, props_destruct):
    os.makedirs("src/features/quiz/components/views", exist_ok=True)
    with open(f"src/features/quiz/components/views/{name}.tsx", "w", encoding="utf-8") as f:
        f.write(imports + "\n\n")
        f.write(props_def + "\n\n")
        f.write(f"export function {name}({props_destruct}) {{\n")
        f.write("  const {\n")
        
        # Super simple variable destructuring by looking at what exists in the original code
        all_vars = [
          "authMode", "setAuthMode", "username", "setUsername", "email", "setEmail", 
          "password", "setPassword", "authenticate", "loading", "error",
          "currentPlayer", "createRoom", "joinRoom", "roomInput", "setRoomInput",
          "snapshot", "now", "isHost", "startGame", "revealQuestion", "advanceGame", "answer",
          "selected", "answeredQuestionId", "setSnapshot", "setActiveTab",
          "currentQuestion", "questionStartedAt", "remainingMs", "currentQuestionProgress",
          "selectedForCurrentQuestion", "hasAnswered",
          "myAnswers", "accuracyStats", "paceData", "avgPace",
          "runtime", "displayedSocketState", "roomCode"
        ]
        
        used_vars = [v for v in all_vars if re.search(r'\b' + v + r'\b', content)]
        # Add special case: `initials` and `formatRoomCode` are imported/passed differently
        
        f.write("    " + ",\n    ".join(used_vars) + "\n")
        f.write("  } = props;\n\n")
        
        f.write(f"  return (\n    <>\n{content}\n    </>\n  );\n}}\n")

write_view("AuthView", auth_code, 
    'import { motion } from "framer-motion";\nimport { cn } from "@/lib/utils";\nimport type { AuthMode } from "../quizrush-experience";', 
    'export interface AuthViewProps {\n  [key: string]: any;\n}', 
    'props: AuthViewProps')

write_view("LobbyView", lobby_code,
    'import { motion } from "framer-motion";\nimport { cn, initials } from "@/lib/utils";',
    'export interface LobbyViewProps {\n  [key: string]: any;\n}',
    'props: LobbyViewProps')

write_view("PlayView", play_code, 
    'import { motion } from "framer-motion";\nimport { cn } from "@/lib/utils";\nimport { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from "recharts";', 
    'export interface PlayViewProps {\n  [key: string]: any;\n}', 
    'props: PlayViewProps')

write_view("LeaderboardView", leagues_code,
    'import { motion } from "framer-motion";\nimport { cn, initials } from "@/lib/utils";',
    'export interface LeaderboardViewProps {\n  [key: string]: any;\n}',
    'props: LeaderboardViewProps')

write_view("AnalyticsView", analytics_code,
    'import { motion } from "framer-motion";\nimport { cn } from "@/lib/utils";\nimport { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";',
    'export interface AnalyticsViewProps {\n  [key: string]: any;\n}',
    'props: AnalyticsViewProps')

write_view("ActivityFeed", activity_code,
    'import { motion, AnimatePresence } from "framer-motion";\nimport { cn } from "@/lib/utils";',
    'export interface ActivityFeedProps {\n  [key: string]: any;\n}',
    'props: ActivityFeedProps')

print("Generated views with proper extraction.")
