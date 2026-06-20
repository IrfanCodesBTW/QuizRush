import re
import os

with open("src/features/quiz/components/quizrush-experience.tsx", "r", encoding="utf-8") as f:
    code = f.read()

def extract_block(start_str, end_str, include_start=False, count_end=1):
    start_idx = code.find(start_str)
    if start_idx == -1:
        return ""
    if not include_start:
        start_idx = start_idx + len(start_str)
    
    end_idx = start_idx
    for _ in range(count_end):
        end_idx = code.find(end_str, end_idx)
        if end_idx == -1:
            break
        end_idx += len(end_str)
        
    return code[start_idx:end_idx]

auth_code = extract_block("/* Authentication Screen */\n          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>", "</motion.div>", True, 1)
lobby_code = extract_block("/* Room Launcher Screen */\n          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>", "</motion.div>", True, 1)

# Tab blocks
play_code = extract_block('{activeTab === "play" && (\n', ')}', False, 1)
# remove the trailing )\n if exists
if play_code.endswith(')'): play_code = play_code[:-1]

leagues_code = extract_block('{activeTab === "leagues" && (\n', ')}', False, 1)
if leagues_code.endswith(')'): leagues_code = leagues_code[:-1]

analytics_code = extract_block('{activeTab === "analytics" && (\n', ')}', False, 1)
if analytics_code.endswith(')'): analytics_code = analytics_code[:-1]

activity_code = extract_block('{activeTab === "activity" && (\n', ')}', False, 1)
if activity_code.endswith(')'): activity_code = activity_code[:-1]

def write_view(name, content, imports, props_def, props_destruct):
    os.makedirs("src/features/quiz/components/views", exist_ok=True)
    with open(f"src/features/quiz/components/views/{name}.tsx", "w", encoding="utf-8") as f:
        f.write(imports + "\n\n")
        f.write(props_def + "\n\n")
        f.write(f"export function {name}({props_destruct}) {{\n")
        f.write(f"  return (\n    <>\n{content}\n    </>\n  );\n}}\n")

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

print("Generated views.")
