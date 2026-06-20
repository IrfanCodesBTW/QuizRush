# 🚀 QuizRush 

**QuizRush** is a real-time, AI-orchestrated multiplayer quiz arena. Designed as a showcase of modern web architecture, it transforms standard quizzes into living, highly interactive live experiences using the power of **Valkey** for sub-100ms low-latency state management, live synchronization, and event-driven architecture.

![QuizRush Preview](docs/quizrush-preview.png) *(Placeholder for project screenshot)*

---

## ✨ Key Features

- **⚡ Real-Time Multiplayer Sync:** Instantaneous question delivery and answer collection powered by Valkey Pub/Sub and Socket.io.
- **📊 Dynamic Analytics & Answer Distribution:** See how players answer in real-time with Mentimeter-style animated charts (powered by Recharts and Framer Motion).
- **🏆 Live Animated Leaderboards:** Watch ranks shift instantly as points are awarded based on speed and accuracy.
- **🤖 Agentic Orchestration Layer:**
  - *Game Orchestrator:* Manages rounds, timers, and game progression.
  - *Analytics Agent:* Generates natural-language insights from live answer distributions.
  - *Engagement Agent:* Awards achievements, detects streaks, and drives player excitement.
- **📄 Professional PDF Exports:** Hosts can download comprehensive post-game reports of analytics and rankings natively.
- **🎨 "Playful Intelligence" UI:** Beautiful, celebration-first design using pastel gradients, floating cards, and micro-interactions.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Data Visualization:** Recharts

### Backend & Infrastructure
- **Real-time Server:** Socket.io via custom Node server (`tsx`)
- **Primary Data Store & Sync:** Valkey (via `ioredis`)
- **PDF Generation:** `@react-pdf/renderer`

---

## 🏗️ Valkey Data Architecture

QuizRush leverages Valkey not just as a cache, but as the core engine driving the platform:

- **Hashes:** Stores `player:{id}` state (username, score, rank, streak).
- **Sets:** Manages `room:{roomId}:players` membership.
- **Sorted Sets:** Powers the real-time `leaderboard:{roomId}` via atomic score updates.
- **Streams:** Maintains an append-only event history `room:{roomId}:events` for activity feeds and PDF generation.
- **Pub/Sub:** Handles low-latency broadcasting (`quiz:start`, `quiz:question`, `leaderboard:update`).
- **TTL:** Manages room lifecycle cleanup automatically.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- A running **Valkey** instance (or Redis compatible server)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/quizrush.git
   cd quizrush
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory (you can copy `.env.example` if available):
   ```env
   VALKEY_URL=redis://localhost:6379
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   ```

4. **Run the Development Servers:**
   QuizRush requires both the Next.js frontend and the WebSocket server to be running simultaneously. We've included a handy concurrent script:
   ```bash
   npm run dev:all
   ```
   *This starts Next.js on `localhost:3000` and the Socket.io server on `localhost:3001`.*

---

## 📂 Project Structure

```text
quizrush/
├── src/
│   ├── app/             # Next.js 15 App Router pages and API routes
│   ├── features/        # Feature-based UI components (quiz experience, lobbys)
│   ├── lib/             # Utilities and shared logic
│   ├── server/          # Backend logic, Valkey config, Agents, PDF generator
│   └── types/           # Global TypeScript definitions
├── scripts/             # Custom dev scripts (e.g., realtime-server.ts)
└── docs/                # PRD and planning documents
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/quizrush/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Built with ❤️ for the Valkey Hackathon.*
