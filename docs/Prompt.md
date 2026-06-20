Build QuizRush, a production-quality real-time multiplayer quiz platform for the Valkey Hackathon. The application must showcase Valkey as the core infrastructure layer through Pub/Sub, Streams, Sorted Sets, Hashes, Sets, atomic score updates, and TTL-based room lifecycle management.

The design language must follow the attached UI references: pastel gradients, playful gamification, rounded cards, floating surfaces, soft shadows, mascot-friendly aesthetics, Mentimeter-inspired answer visualizations, and animated leaderboard transitions.

Technology requirements:

Frontend:

* Next.js 15
* TypeScript
* Tailwind CSS
* Framer Motion
* Recharts
* Responsive mobile-first architecture

Backend:

* Next.js API routes
* Valkey
* REST + WebSocket architecture

Core Features:

* Guest login with generated usernames
* Email/password authentication
* Room creation and joining
* Real-time multiplayer synchronization
* Live question broadcasting
* Countdown timers
* Instant answer submission
* Answer distribution graphs
* Animated leaderboard
* Achievement system
* PDF export of results

Valkey Implementation:

* Hashes for player state
* Sorted Sets for leaderboard ranking
* Sets for room membership
* Streams for event history
* Pub/Sub for real-time communication
* TTL cleanup for inactive rooms

Agent Layer:

* Game Orchestrator Agent
* Analytics Agent
* Engagement Agent

The user experience must feel closer to Mentimeter, Duolingo, and modern consumer applications than enterprise dashboards. Every interaction should feel alive, animated, and celebratory.

Success Criteria:

* Multiple players can join simultaneously
* Scores update instantly
* Leaderboard animates in real time
* Answer distributions update live
* Event stream proves Valkey activity
* Application remains responsive on desktop and mobile
* Entire system is demo-ready for hackathon judges

Do not generate placeholder dashboards. Build complete, connected, production-quality flows with polished UI, realistic interactions, and strong visual hierarchy.
