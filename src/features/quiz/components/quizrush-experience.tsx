"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnswerOption,
  Player,
  RoomEvent,
  RoomSnapshot,
  ValkeyPrimitive,
} from "@/types/quiz";
import { answerOptions, demoQuiz } from "@/lib/demo-quiz";
import { cn, formatRoomCode, initials } from "@/lib/utils";

type RuntimeStatus = {
  valkeyMode: "valkey" | "memory";
  ttlSeconds: number;
  primitives: ValkeyPrimitive[];
};

type AuthMode = "guest" | "login" | "register";

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

export function QuizRushExperience() {
  const [authMode, setAuthMode] = useState<AuthMode>("guest");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [player, setPlayer] = useState<Player | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [selected, setSelected] = useState<AnswerOption | null>(null);
  const [answeredQuestionId, setAnsweredQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socketState, setSocketState] = useState<"connected" | "fallback">("fallback");
  const [now, setNow] = useState(0);

  // Tab State
  const [activeTab, setActiveTab] = useState<"play" | "leagues" | "analytics" | "activity">("play");

  const currentPlayer = useMemo(() => {
    if (!player) {
      return null;
    }
    return snapshot?.players.find((item) => item.id === player.id) ?? player;
  }, [player, snapshot]);

  const isHost = Boolean(snapshot && currentPlayer?.id === snapshot.room.hostId);
  const currentQuestion = snapshot?.currentQuestion ?? null;
  const roomCode = snapshot?.room.code;
  const questionStartedAt = currentQuestion && snapshot?.room.questionStartedAt
    ? new Date(snapshot.room.questionStartedAt).getTime()
    : null;
  const remainingMs =
    snapshot?.room.questionEndsAt && snapshot.room.status === "live"
      ? Math.max(0, new Date(snapshot.room.questionEndsAt).getTime() - now)
      : 0;
  const hasAnswered = Boolean(currentQuestion && answeredQuestionId === currentQuestion.id);
  const selectedForCurrentQuestion = hasAnswered ? selected : null;
  const displayedSocketState = roomCode ? socketState : "idle";

  const loadRoom = useCallback(async (code: string) => {
    const data = await getJson<{ snapshot: RoomSnapshot }>(`/api/rooms/${encodeURIComponent(code)}`);
    setSnapshot(data.snapshot);
  }, []);

  const runAction = useCallback(async <T,>(name: string, action: () => Promise<T>) => {
    setLoading(name);
    setError(null);
    try {
      return await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went sideways.");
      return null;
    } finally {
      setLoading(null);
    }
  }, []);

  async function authenticate() {
    const result = await runAction("auth", async () => {
      if (authMode === "guest") {
        return postJson<{ player: Player }>("/api/auth/guest", {
          username: username.trim() || undefined,
        });
      }

      if (authMode === "register") {
        return postJson<{ player: Player }>("/api/auth/register", {
          email,
          password,
          username: username.trim() || undefined,
        });
      }

      return postJson<{ player: Player }>("/api/auth/login", { email, password });
    });

    if (result?.player) {
      setPlayer(result.player);
    }
  }

  async function createRoom() {
    const result = await runAction("create-room", () =>
      postJson<{ snapshot: RoomSnapshot }>("/api/rooms/create"),
    );
    if (result?.snapshot) {
      setSnapshot(result.snapshot);
      setRoomInput(result.snapshot.room.code);
    }
  }

  async function joinRoom() {
    const code = formatRoomCode(roomInput);
    const result = await runAction("join-room", () =>
      postJson<{ snapshot: RoomSnapshot }>("/api/rooms/join", { roomCode: code }),
    );
    if (result?.snapshot) {
      setSnapshot(result.snapshot);
    }
  }

  async function startGame() {
    if (!roomCode) {
      return;
    }
    const result = await runAction("start-game", () =>
      postJson<{ snapshot: RoomSnapshot }>("/api/game/start", { roomCode }),
    );
    if (result?.snapshot) {
      setSnapshot(result.snapshot);
    }
  }

  async function revealQuestion() {
    if (!roomCode) {
      return;
    }
    const result = await runAction("reveal", () =>
      postJson<{ snapshot: RoomSnapshot }>("/api/game/reveal", { roomCode }),
    );
    if (result?.snapshot) {
      setSnapshot(result.snapshot);
    }
  }

  async function advanceGame() {
    if (!roomCode) {
      return;
    }
    setSelected(null);
    setAnsweredQuestionId(null);
    const result = await runAction("advance", () =>
      postJson<{ snapshot: RoomSnapshot }>("/api/game/advance", { roomCode }),
    );
    if (result?.snapshot) {
      setSnapshot(result.snapshot);
    }
  }

  const answer = useCallback(async (option: AnswerOption) => {
    if (!roomCode || !currentQuestion || !questionStartedAt || hasAnswered) {
      return;
    }
    setSelected(option);
    const responseTimeMs = Date.now() - questionStartedAt;
    const result = await runAction("answer", () =>
      postJson<{ snapshot: RoomSnapshot }>("/api/game/answer", {
        roomCode,
        questionId: currentQuestion.id,
        selectedOption: option,
        responseTimeMs,
      }),
    );
    if (result?.snapshot) {
      setAnsweredQuestionId(currentQuestion.id);
      setSnapshot(result.snapshot);
    }
  }, [roomCode, currentQuestion, questionStartedAt, hasAnswered, runAction]);

  useEffect(() => {
    getJson<RuntimeStatus>("/api/runtime")
      .then(setRuntime)
      .catch(() => setRuntime(null));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!roomCode) {
      return;
    }

    const interval = window.setInterval(() => {
      loadRoom(roomCode).catch(() => undefined);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [loadRoom, roomCode]);

  useEffect(() => {
    if (!roomCode || !process.env.NEXT_PUBLIC_SOCKET_URL) {
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;

    import("socket.io-client")
      .then(({ io }) => {
        if (disposed) {
          return;
        }
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
          transports: ["websocket"],
        });
        cleanup = () => socket.disconnect();
        socket.on("connect", () => {
          setSocketState("connected");
          socket.emit("room:join", roomCode);
        });
        socket.on("connect_error", () => setSocketState("fallback"));
        socket.on("room:event", () => {
          loadRoom(roomCode).catch(() => undefined);
        });
      })
      .catch(() => setSocketState("fallback"));

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [loadRoom, roomCode]);

  // Tab Details Configuration
  const tabs = [
    { id: "play", label: "Play", icon: "rocket_launch", color: "bg-rocket-orange" },
    { id: "leagues", label: "Leagues", icon: "emoji_events", color: "bg-emoji-yellow" },
    { id: "analytics", label: "Analytics", icon: "analytics", color: "bg-sticker-purple" },
    { id: "activity", label: "Console", icon: "database", color: "bg-primary-container" },
  ] as const;

  const currentQuestionProgress = currentQuestion
    ? Math.max(0, Math.min(100, (remainingMs / currentQuestion.durationMs) * 100))
    : 0;

  // Real Statistics Calculations
  const myAnswers = useMemo(() => {
    if (!currentPlayer || !snapshot?.playerAnswers) return [];
    return snapshot.playerAnswers[currentPlayer.id] || [];
  }, [currentPlayer, snapshot]);

  const accuracyStats = useMemo(() => {
    return demoQuiz.map((q, idx) => {
      const ans = myAnswers.find((a) => a.questionId === q.id);
      const topic = idx === 0 ? "Sorted Sets" : idx === 1 ? "Streams" : idx === 2 ? "Pub/Sub" : "TTL";
      return {
        topic,
        answered: !!ans,
        correct: ans ? ans.correct : false,
        percentage: ans ? (ans.correct ? 100 : 0) : 0,
      };
    });
  }, [myAnswers]);

  const paceData = useMemo(() => {
    return demoQuiz.map((q, idx) => {
      const ans = myAnswers.find((a) => a.questionId === q.id);
      const topic = idx === 0 ? "Sorted Set" : idx === 1 ? "Stream" : idx === 2 ? "Pub/Sub" : "TTL";
      return {
        name: topic,
        pace: ans ? ans.responseTimeMs / 1000 : 0, // in seconds
        correct: ans ? ans.correct : false,
      };
    });
  }, [myAnswers]);

  const avgPace = useMemo(() => {
    const answered = myAnswers.filter((a) => a.responseTimeMs > 0);
    if (answered.length === 0) return "0.0";
    const sum = answered.reduce((acc, curr) => acc + curr.responseTimeMs, 0);
    return (sum / answered.length / 1000).toFixed(1);
  }, [myAnswers]);

  return (
    <main className="min-h-screen pb-24 md:pb-8 pt-6 px-4 pattern-bg relative select-none">
      {/* Floating Top Navigation (visible globally) */}
      <div className="fixed top-0 left-0 w-full z-50 p-2 md:p-4 flex justify-center pointer-events-none">
        <nav className="pointer-events-auto flex items-center justify-between lg:justify-start gap-2 md:gap-4 bg-white border-4 border-black rounded-full px-4 md:px-6 py-2 brutalist-shadow w-[95%] max-w-5xl">
          {/* Back button (when logged in) */}
          {currentPlayer && (
            <button
              onClick={() => {
                if (snapshot) {
                  setSnapshot(null);
                  setRoomInput("");
                } else {
                  setPlayer(null);
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-surface-container hover:bg-surface-container-high hover:translate-y-[-1px] transition-all brutalist-shadow-sm mr-1 cursor-pointer flex-shrink-0"
              title={snapshot ? "Exit Room" : "Log Out"}
            >
              <span className="material-symbols-outlined font-black text-black">arrow_back</span>
            </button>
          )}

          {/* Logo */}
          <button
            onClick={() => {
              if (snapshot) {
                setActiveTab("play");
              } else {
                setPlayer(null);
                setSnapshot(null);
                setRoomInput("");
              }
            }}
            className="font-heading-md text-[20px] md:text-[28px] text-rocket-orange uppercase tracking-tighter mr-2 md:mr-6 cursor-pointer select-none hover:opacity-80 transition-opacity flex-shrink-0 bg-transparent border-none outline-none"
          >
            QuizRush
          </button>

          {/* Desktop Tabs */}
          {currentPlayer && snapshot && (
            <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
              {tabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "px-4 py-2 rounded-full transition-all flex items-center gap-1.5 font-label-bold text-label-bold group uppercase border-2 border-transparent cursor-pointer",
                      isActive
                        ? `${t.color} text-black border-black shadow-[3px_3px_0px_#000] translate-y-[-1px]`
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-black"
                    )}
                  >
                    <span
                      className={cn(
                        "material-symbols-outlined text-[20px] transition-colors",
                        isActive ? "fill-icon" : ""
                      )}
                    >
                      {t.icon}
                    </span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Divider */}
          {currentPlayer && snapshot && (
            <div className="hidden lg:block w-[2px] h-8 bg-black/20 mx-2 rounded-full flex-shrink-0"></div>
          )}

          {/* Right side status / profile widgets */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {currentPlayer ? (
              <>
                {snapshot ? (
                  <>
                    {/* Score Coin */}
                    <div className="bg-emoji-yellow border-2 border-black rounded-full px-2.5 py-1 flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] hover:translate-y-[-1px] transition-transform">
                      <span className="material-symbols-outlined fill-icon text-[16px] md:text-[18px]">monetization_on</span>
                      <span className="font-label-bold text-[11px] md:text-[13px] text-black">{currentPlayer.score}</span>
                    </div>

                    {/* Streak Diamond */}
                    <div className="bg-sticker-purple border-2 border-black rounded-full px-2.5 py-1 flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] hover:translate-y-[-1px] transition-transform">
                      <span className="material-symbols-outlined fill-icon text-[16px] md:text-[18px]">diamond</span>
                      <span className="font-label-bold text-[11px] md:text-[13px] text-black">{currentPlayer.streak}</span>
                    </div>
                  </>
                ) : (
                  /* Launcher status tag */
                  <div className="bg-primary-container border-2 border-black rounded-full px-3 py-1 shadow-[2px_2px_0px_#000] hidden sm:flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">stars</span>
                    <span className="font-label-bold text-[11px] text-black uppercase">Lobby Launcher</span>
                  </div>
                )}

                {/* User profile */}
                <div className="font-label-bold text-label-bold text-on-surface border-2 border-black px-3.5 py-1.5 rounded-full shadow-[2px_2px_0px_#000] bg-white cursor-default hidden md:block uppercase truncate max-w-[100px] lg:max-w-[140px]" title={currentPlayer.username}>
                  {currentPlayer.username}
                </div>
              </>
            ) : (
              /* Guest/Home state - show live Valkey mode */
              <div className="bg-emoji-yellow border-2 border-black rounded-full px-3 py-1 flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] hover:translate-y-[-1px] transition-transform">
                <span className="material-symbols-outlined fill-icon text-[16px] md:text-[18px] text-black">electric_bolt</span>
                <span className="font-label-bold text-[11px] md:text-[12px] text-black uppercase font-black">
                  {runtime ? (runtime.valkeyMode === "valkey" ? "Valkey Live" : "Memory Active") : "Connecting..."}
                </span>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-5xl flex flex-col gap-6 pt-20 md:pt-24">
        
        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-poster border-4 border-black bg-error-container p-4 text-body-md font-bold text-on-error-container brutalist-shadow"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined font-black">error</span>
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Display Screens Based on Current Authentication/Room Stage */}
        {!currentPlayer ? (
          /* Authentication Screen */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <section className="grid min-h-[75vh] items-center gap-6 lg:grid-cols-[1.1fr_0.9fr] w-full mt-4">
              <div className="max-w-3xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white border-2 border-black px-4 py-2 text-sm font-bold text-rocket-orange shadow-[3px_3px_0px_#000]">
                  <span className="material-symbols-outlined text-[20px] fill-icon">zap</span>
                  <span className="font-label-bold uppercase">Hackathon Arena live</span>
                </div>
                <h2 className="font-hero-xxl text-hero-xl-mobile md:text-hero-xl lg:text-[100px] text-black uppercase tracking-tighter drop-shadow-[5px_5px_0px_#C9A8FF] leading-none mb-6">
                  A multiplayer quiz arena that feels alive.
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant bg-white border-4 border-black px-6 py-4 inline-block rounded-poster brutalist-shadow max-w-2xl leading-relaxed">
                  Host timed question sessions, compete in real-time, and watch scores,
                  dynamic podium arrays, brain analytics, and Valkey events sync instantly.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4 max-w-xl">
                  {[
                    ["Pub/Sub", "broadcasts"],
                    ["Streams", "proof logs"],
                    ["ZSET", "rankings"],
                  ].map(([title, caption]) => (
                    <div key={title} className="bg-white border-4 border-black rounded-poster p-4 text-center brutalist-shadow">
                      <p className="font-heading-md text-[24px] text-black uppercase">{title}</p>
                      <p className="font-label-bold text-label-bold text-secondary uppercase mt-1">{caption}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow w-full max-w-md mx-auto">
                <div className="mb-6 flex rounded-full bg-surface-container p-1 border-2 border-black">
                  {(["guest", "login", "register"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAuthMode(mode)}
                      className={cn(
                        "flex-1 rounded-full py-2 font-label-bold text-label-bold transition-all uppercase text-[12px] md:text-[14px]",
                        authMode === mode
                          ? "bg-emoji-yellow text-black border-2 border-black shadow-[2px_2px_0px_#000]"
                          : "text-on-surface-variant hover:text-black"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={authMode === "guest" ? "Display name, optional" : "Username, optional"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white border-4 border-black rounded-full px-5 py-3 font-body-md text-body-md placeholder:text-secondary focus:outline-none focus:ring-4 focus:ring-electric-blue/30"
                  />
                  {authMode !== "guest" && (
                    <>
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border-4 border-black rounded-full px-5 py-3 font-body-md text-body-md placeholder:text-secondary focus:outline-none focus:ring-4 focus:ring-electric-blue/30"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white border-4 border-black rounded-full px-5 py-3 font-body-md text-body-md placeholder:text-secondary focus:outline-none focus:ring-4 focus:ring-electric-blue/30"
                      />
                    </>
                  )}
                  <button
                    onClick={authenticate}
                    disabled={loading === "auth"}
                    className="w-full bg-electric-blue text-white border-4 border-black rounded-full py-4 flex items-center justify-center gap-2 font-heading-md text-[20px] uppercase brutalist-shadow-hover transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="material-symbols-outlined font-black">login</span>
                    <span>{loading === "auth" ? "Entering arena..." : "Enter QuizRush"}</span>
                  </button>
                </div>
              </div>
            </section>
          </motion.div>
        ) : !snapshot ? (
          /* Room Launcher Screen */
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <section className="grid min-h-[70vh] items-center gap-6 lg:grid-cols-[0.9fr_1.1fr] w-full max-w-5xl mx-auto">
              <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow h-full flex flex-col justify-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-black bg-primary-container font-heading-md text-[36px] shadow-[4px_4px_0px_#000] select-none">
                  {initials(currentPlayer.username)}
                </div>
                <h2 className="font-heading-lg text-heading-lg text-black uppercase drop-shadow-[2px_2px_0px_#FFD938]">
                  Ready, {currentPlayer.username}?
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant mt-4 bg-surface-container border-2 border-black p-4 rounded-xl leading-relaxed">
                  Host a room for your friends to showcase Valkey real-time operations, or join an active room code now!
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Host a Room Option */}
                <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow flex flex-col justify-between h-[360px]">
                  <div>
                    <span className="material-symbols-outlined text-[48px] text-sticker-purple fill-icon mb-4">crown</span>
                    <h3 className="font-heading-md text-[28px] uppercase text-black">Host a room</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
                      Creates a TTL-backed room, registers you as host, and opens a customizable player lobby.
                    </p>
                  </div>
                  <button
                    onClick={createRoom}
                    disabled={loading === "create-room"}
                    className="w-full bg-sticker-purple border-4 border-black rounded-full py-3.5 flex items-center justify-center gap-2 font-label-bold text-label-bold text-black brutalist-shadow-sm hover:brutalist-shadow-hover transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined font-black">rocket_launch</span>
                    <span>{loading === "create-room" ? "Hosting..." : "Create room"}</span>
                  </button>
                </div>

                {/* Join a Room Option */}
                <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow flex flex-col justify-between h-[360px]">
                  <div>
                    <span className="material-symbols-outlined text-[48px] text-primary-container fill-icon mb-4">group</span>
                    <h3 className="font-heading-md text-[28px] uppercase text-black">Join a room</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
                      Pushes your player hash into the active room set and subscribes to state change updates.
                    </p>
                    <input
                      type="text"
                      placeholder="QR-7421"
                      value={roomInput}
                      onChange={(e) => setRoomInput(formatRoomCode(e.target.value))}
                      className="mt-4 w-full bg-white border-4 border-black rounded-full px-5 py-2.5 font-body-md text-body-md placeholder:text-secondary uppercase focus:outline-none focus:ring-4 focus:ring-electric-blue/30"
                    />
                  </div>
                  <button
                    onClick={joinRoom}
                    disabled={loading === "join-room"}
                    className="w-full bg-primary-container border-4 border-black rounded-full py-3.5 flex items-center justify-center gap-2 font-label-bold text-label-bold text-black brutalist-shadow-sm hover:brutalist-shadow-hover transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined font-black">arrow_right_alt</span>
                    <span>{loading === "join-room" ? "Joining..." : "Join room"}</span>
                  </button>
                </div>
              </div>
            </section>
          </motion.div>
        ) : (
          /* Active Room Tabbed Dashboard */
          <div className="w-full">
            <AnimatePresence mode="wait">
              {activeTab === "play" && (
                <motion.div
                  key="play"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex flex-col gap-6"
                >
                  {/* Play Header */}
                  <header className="mb-6 flex flex-col items-center text-center border-b-4 border-black pb-4">
                    <h2 className="font-hero-xl text-hero-xl-mobile md:text-hero-xl text-black uppercase drop-shadow-[4px_4px_0px_#C9A8FF] leading-none text-center">
                      {snapshot.room.status === "lobby"
                        ? "Lobby Setup"
                        : snapshot.room.status === "ended"
                          ? "Quiz Finished"
                          : `Question ${snapshot.room.currentQuestionIndex + 1}`}
                    </h2>
                    <p className="font-body-lg text-body-lg text-on-surface-variant mt-4 bg-white border-2 border-black px-6 py-2 inline-block rounded-full brutalist-shadow-sm rotate-[-1deg]">
                      {snapshot.room.status === "lobby"
                        ? `Share Room Code: ${snapshot.room.code}`
                        : snapshot.room.status === "ended"
                          ? "Final positions revealed!"
                          : `Lobby pacing active`}
                    </p>
                  </header>

                  {/* Lobby Setup Stage */}
                  {snapshot.room.status === "lobby" && (
                    <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                          Host or join, players are pushed to Valkey Sets. Give the lobby code below to players:
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {snapshot.players.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-2 bg-white border-2 border-black px-4 py-2 rounded-full shadow-[2px_2px_0px_#000] hover:translate-y-[-1px] transition-transform"
                            >
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold border-2 border-black select-none text-black">
                                {initials(p.username)}
                              </span>
                              <span className="font-label-bold text-label-bold text-black uppercase">{p.username}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-sticker-purple border-4 border-black rounded-poster p-6 text-center flex flex-col justify-center items-center brutalist-shadow w-full md:w-[280px]">
                        <p className="font-hero-xl text-[64px] md:text-hero-xl text-black leading-none">{snapshot.players.length}</p>
                        <p className="font-label-bold text-label-bold text-black uppercase mt-1">players ready</p>
                        {isHost ? (
                          <button
                            onClick={startGame}
                            disabled={loading === "start-game"}
                            className="mt-6 w-full bg-white border-4 border-black rounded-full py-2.5 flex items-center justify-center gap-1.5 font-label-bold text-label-bold text-black brutalist-shadow-sm hover:brutalist-shadow-hover transition-all"
                          >
                            <span className="material-symbols-outlined font-black">play_arrow</span>
                            <span>Start Quiz</span>
                          </button>
                        ) : (
                          <p className="mt-6 font-label-bold text-label-bold text-black uppercase animate-pulse">Waiting for host...</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quiz Core Gameplay State */}
                  {currentQuestion && snapshot.room.status !== "lobby" && snapshot.room.status !== "ended" && (
                    <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow w-full max-w-4xl mx-auto flex flex-col gap-6">
                      <div className="flex items-center justify-between gap-4 border-b-4 border-black pb-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[28px]">timer</span>
                          <span className="font-heading-md text-[24px] uppercase text-black">
                            {snapshot.room.status === "live" ? `${Math.ceil(remainingMs / 1000)}s left` : "Times Up!"}
                          </span>
                        </div>
                        <div className="bg-emoji-yellow border-2 border-black px-4 py-2 rounded-full font-label-bold text-label-bold text-black brutalist-shadow-sm uppercase">
                          Question {snapshot.room.currentQuestionIndex + 1}
                        </div>
                      </div>

                      {/* Custom countdown bar */}
                      <div className="h-8 w-full bg-surface-container border-4 border-black rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full border-r-4 border-black transition-all duration-300",
                            remainingMs < 5000 ? "bg-error-red animate-pulse" : "bg-electric-blue"
                          )}
                          style={{ width: `${currentQuestionProgress}%` }}
                        ></div>
                      </div>

                      <h3 className="font-heading-md text-heading-md text-black uppercase leading-tight mt-2">
                        {currentQuestion.prompt}
                      </h3>

                      <div className="grid gap-4 sm:grid-cols-2 mt-2">
                        {answerOptions.map((option) => {
                          const chosen = selected === option;
                          const isCorrect = snapshot.room.status === "reveal" && option === currentQuestion.correctAnswer;

                          let cardBg = "bg-white";
                          let shadowColor = "#000";
                          if (chosen) {
                            cardBg = "bg-sticker-purple";
                          }
                          if (isCorrect) {
                            cardBg = "bg-primary-container";
                          }

                          return (
                            <button
                              key={option}
                              disabled={snapshot.room.status !== "live" || hasAnswered || loading === "answer"}
                              onClick={() => answer(option)}
                              className={cn(
                                "min-h-[120px] rounded-poster p-4 border-4 border-black text-left brutalist-shadow-sm brutalist-shadow-hover transition-all flex flex-col justify-between group disabled:pointer-events-none",
                                cardBg
                              )}
                            >
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white border-2 border-white select-none shadow-[2px_2px_0px_#000]">
                                {option}
                              </span>
                              <span className="block font-heading-md text-[20px] md:text-[24px] text-black uppercase mt-2 group-hover:text-rocket-orange transition-colors">
                                {currentQuestion.options[option]}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Control Panel */}
                      <div className="mt-4 flex flex-wrap gap-4 border-t-4 border-black pt-4">
                        {hasAnswered && (
                          <div className="inline-flex items-center gap-2 bg-primary-fixed border-2 border-black rounded-full px-4 py-2 font-label-bold text-label-bold text-on-primary-fixed shadow-[2px_2px_0px_#000] uppercase">
                            <span className="material-symbols-outlined fill-icon text-[18px]">check_circle</span>
                            <span>Answer locked</span>
                          </div>
                        )}
                        {isHost && snapshot.room.status === "live" && (
                          <button
                            onClick={revealQuestion}
                            disabled={loading === "reveal"}
                            className="bg-emoji-yellow border-4 border-black rounded-full px-6 py-2.5 font-label-bold text-label-bold text-black brutalist-shadow-sm hover:brutalist-shadow-hover transition-all uppercase"
                          >
                            Reveal results
                          </button>
                        )}
                        {isHost && snapshot.room.status === "reveal" && (
                          <button
                            onClick={advanceGame}
                            disabled={loading === "advance"}
                            className="bg-primary-container border-4 border-black rounded-full px-6 py-2.5 font-label-bold text-label-bold text-black brutalist-shadow-sm hover:brutalist-shadow-hover transition-all uppercase"
                          >
                            Next question
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reveal Answer distribution chart */}
                  {snapshot.room.status === "reveal" && snapshot.answerDistribution && (
                    <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow w-full max-w-4xl mx-auto">
                      <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-2">
                        <h3 className="font-heading-md text-heading-md uppercase text-black">Live distribution</h3>
                        <span className="bg-surface-container border-2 border-black px-4 py-2 rounded-full font-label-bold text-label-bold text-black brutalist-shadow-sm uppercase">
                          {snapshot.answerDistribution.totalAnswers} answers submitted
                        </span>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={snapshot.answerDistribution.options} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#bccabf" />
                            <XAxis type="number" hide domain={[0, "dataMax + 1"]} />
                            <YAxis type="category" dataKey="option" width={30} tickLine={false} axisLine={false} />
                            <Tooltip
                              cursor={{ fill: "rgba(0,0,0,0.05)" }}
                              formatter={(value, _name, item) => [
                                `${value} votes (${item.payload.percentage}%)`,
                                item.payload.label,
                              ]}
                            />
                            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                              {snapshot.answerDistribution.options.map((entry) => (
                                <Cell
                                  key={entry.option}
                                  fill={entry.isCorrect ? "#83f9bd" : "#C9A8FF"}
                                  stroke="#000"
                                  strokeWidth={2}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Ended Room / Result Reveal Stage */}
                  {snapshot.room.status === "ended" && (
                    <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <div className="mb-4 inline-flex items-center gap-2 bg-emoji-yellow border-2 border-black rounded-full px-4 py-2 font-label-bold text-label-bold text-black shadow-[2px_2px_0px_#000] uppercase">
                          <span className="material-symbols-outlined fill-icon text-[18px]">trophy</span>
                          <span>Final ranking ready</span>
                        </div>
                        <h3 className="font-heading-lg text-heading-lg text-black uppercase leading-none">
                          Winner: {snapshot.leaderboard[0]?.username ?? "Nobody"}
                        </h3>
                        <p className="font-body-lg text-body-lg text-on-surface-variant mt-4 leading-relaxed bg-surface-container p-4 rounded-xl border-2 border-black">
                          {snapshot.leaderboard[0]
                            ? `Champion with ${snapshot.leaderboard[0].score} points! Download the leaderboard breakdown as a PDF to check your rank history.`
                            : "Quiz concluded with no participants."}
                        </p>
                      </div>
                      <a
                        href={`/api/export/pdf/${snapshot.room.code}`}
                        className="flex min-h-[160px] w-full md:w-[260px] flex-col items-center justify-center gap-2 bg-rocket-orange border-4 border-black text-white rounded-poster brutalist-shadow hover:brutalist-shadow-hover transition-all select-none"
                      >
                        <span className="material-symbols-outlined text-[48px]">download</span>
                        <span className="font-heading-md text-[20px] uppercase text-center">Export PDF</span>
                      </a>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "leagues" && (
                <motion.div
                  key="leagues"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  {/* Leagues Podium and Pack View */}
                  <div className="w-full max-w-4xl mx-auto flex flex-col items-center mt-4">
                    {/* Header */}
                    <div className="text-center mb-10 relative w-full">
                      <div className="absolute -top-10 left-10 text-sticker-purple rotate-[-15deg] sticker-float z-[-1]">
                        <span className="material-symbols-outlined text-[80px] fill-icon opacity-20">stars</span>
                      </div>
                      <div className="absolute -top-5 right-10 text-primary-container rotate-[20deg] sticker-float z-[-1]" style={{ animationDelay: "1s" }}>
                        <span className="material-symbols-outlined text-[60px] fill-icon opacity-30">celebration</span>
                      </div>
                      <h1 className="font-hero-xl text-hero-xl-mobile md:text-hero-xl text-black uppercase tracking-tighter drop-shadow-[4px_4px_0px_#FFD938] leading-none text-center">
                        Global Leagues
                      </h1>
                      <p className="font-body-lg text-body-lg text-on-surface-variant mt-4 font-bold border-2 border-black inline-block px-4 py-1.5 rounded-full bg-white shadow-[3px_3px_0px_#000] rotate-1 uppercase">
                        Season 42 Finals
                      </p>
                    </div>

                    {/* 3D Podium Display */}
                    {snapshot.leaderboard.length > 0 ? (
                      <div className="flex justify-center items-end h-[380px] md:h-[450px] gap-2 md:gap-6 w-full mb-12 mt-16 relative">
                        {/* 2nd Place Podium */}
                        {snapshot.leaderboard[1] ? (
                          <div className="flex flex-col items-center justify-end h-[70%] w-[30%] max-w-[200px] relative">
                            <div className="absolute -top-[100px] z-20 sticker-float flex flex-col items-center">
                              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-black bg-primary-container shadow-[3px_3px_0px_#000] overflow-hidden flex items-center justify-center relative font-heading-md text-black text-[22px] select-none">
                                {initials(snapshot.leaderboard[1].username)}
                              </div>
                              <div className="bg-white border-2 border-black rounded-full px-3 py-1 mt-[-10px] z-30 shadow-[2px_2px_0px_#000] text-center">
                                <p className="font-label-bold text-label-bold text-black text-[10px] md:text-[14px]">
                                  {snapshot.leaderboard[1].username}
                                </p>
                                <p className="font-small text-small text-error-red leading-none mt-0.5">{snapshot.leaderboard[1].score} pts</p>
                              </div>
                            </div>
                            <div className="w-full h-[60%] bg-primary-container hard-border brutalist-shadow flex flex-col items-center pt-4 relative overflow-hidden group hover:translate-y-[-5px] transition-transform select-none">
                              <span className="font-heading-lg text-[42px] md:text-heading-lg text-black">2</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-[40%] w-[30%] max-w-[200px] border-4 border-dashed border-black/10 rounded-t-lg bg-black/[0.02]"></div>
                        )}

                        {/* 1st Place Podium */}
                        {snapshot.leaderboard[0] ? (
                          <div className="flex flex-col items-center justify-end h-[100%] w-[35%] max-w-[240px] relative z-10">
                            <div className="absolute -top-[130px] z-20 sticker-float flex flex-col items-center" style={{ animationDelay: "0.5s" }}>
                              <span className="material-symbols-outlined text-emoji-yellow text-[44px] md:text-[56px] fill-icon absolute -top-10 drop-shadow-[2px_2px_0px_#000]">crown</span>
                              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-black bg-emoji-yellow shadow-[4px_4px_0px_#000] overflow-hidden flex items-center justify-center relative font-heading-md text-black text-[28px] select-none">
                                {initials(snapshot.leaderboard[0].username)}
                              </div>
                              <div className="bg-white border-4 border-black rounded-full px-4 py-1.5 mt-[-12px] z-30 shadow-[4px_4px_0px_#000] text-center rotate-[-2deg]">
                                <p className="font-heading-md text-heading-md text-black text-[15px] md:text-[20px] leading-tight">
                                  {snapshot.leaderboard[0].username}
                                </p>
                                <p className="font-label-bold text-label-bold text-rocket-orange leading-none mt-0.5">{snapshot.leaderboard[0].score} pts</p>
                              </div>
                            </div>
                            <div className="w-full h-[75%] bg-emoji-yellow hard-border brutalist-shadow flex flex-col items-center pt-6 relative overflow-hidden group hover:translate-y-[-5px] transition-transform select-none">
                              <span className="font-hero-xl text-[56px] md:text-hero-xl text-black">1</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-[60%] w-[35%] max-w-[240px] border-4 border-dashed border-black/10 rounded-t-lg bg-black/[0.02]"></div>
                        )}

                        {/* 3rd Place Podium */}
                        {snapshot.leaderboard[2] ? (
                          <div className="flex flex-col items-center justify-end h-[60%] w-[30%] max-w-[200px] relative">
                            <div className="absolute -top-[100px] z-20 sticker-float flex flex-col items-center" style={{ animationDelay: "1s" }}>
                              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-black bg-sticker-purple shadow-[3px_3px_0px_#000] overflow-hidden flex items-center justify-center relative font-heading-md text-black text-[22px] select-none">
                                {initials(snapshot.leaderboard[2].username)}
                              </div>
                              <div className="bg-white border-2 border-black rounded-full px-3 py-1 mt-[-10px] z-30 shadow-[2px_2px_0px_#000] text-center">
                                <p className="font-label-bold text-label-bold text-black text-[10px] md:text-[14px]">
                                  {snapshot.leaderboard[2].username}
                                </p>
                                <p className="font-small text-small text-electric-blue leading-none mt-0.5">{snapshot.leaderboard[2].score} pts</p>
                              </div>
                            </div>
                            <div className="w-full h-[50%] bg-sticker-purple hard-border brutalist-shadow flex flex-col items-center pt-4 relative overflow-hidden group hover:translate-y-[-5px] transition-transform select-none">
                              <span className="font-heading-lg text-[42px] md:text-heading-lg text-black">3</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-[30%] w-[30%] max-w-[200px] border-4 border-dashed border-black/10 rounded-t-lg bg-black/[0.02]"></div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow text-center w-full max-w-lg mt-8 py-10">
                        <p className="font-heading-md text-heading-md text-secondary uppercase">No ranks yet</p>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-2">Start the quiz to see ranks update live.</p>
                      </div>
                    )}

                    {/* Ranks 4+ List */}
                    {snapshot.leaderboard.length > 3 && (
                      <div className="w-full max-w-2xl space-y-4 mt-8 mb-12">
                        <h2 className="font-heading-md text-heading-md text-black uppercase mb-4 inline-block bg-white px-4 py-2 border-4 border-black shadow-[3px_3px_0px_#000] rotate-1">
                          The Rest of the Pack
                        </h2>
                        {snapshot.leaderboard.slice(3).map((entry) => {
                          const isSelf = entry.id === currentPlayer?.id;
                          return (
                            <div
                              key={entry.id}
                              className={cn(
                                "hard-border rounded-xl p-4 flex items-center justify-between brutalist-shadow hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#000] transition-all group cursor-pointer relative overflow-hidden",
                                isSelf ? "bg-electric-blue text-white shadow-[8px_8px_0px_#000] scale-[1.02] z-10" : "bg-white text-black"
                              )}
                            >
                              <div className="flex items-center gap-4 pl-2">
                                <div className={cn("font-heading-md text-[24px] w-12 text-center", isSelf ? "text-white" : "text-on-surface-variant")}>
                                  {entry.rank}
                                </div>
                                <div className="w-12 h-12 rounded-full border-2 border-black bg-sticker-purple overflow-hidden flex items-center justify-center font-bold text-black select-none">
                                  {initials(entry.username)}
                                </div>
                                <div>
                                  <h3 className={cn("font-label-bold text-label-bold text-[18px]", isSelf ? "text-white" : "text-black")}>
                                    {entry.username} {isSelf && "(You)"}
                                  </h3>
                                  <p className={cn("font-small text-small flex items-center gap-1 mt-0.5", isSelf ? "text-primary-fixed" : "text-secondary")}>
                                    <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                                    <span>{entry.streak} Streak</span>
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={cn("font-heading-md text-[24px] leading-none", isSelf ? "text-white" : "text-black")}>
                                  {entry.score}
                                </p>
                                <p className={cn("font-small text-small mt-0.5", isSelf ? "text-secondary-fixed" : "text-secondary")}>
                                  Points
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "analytics" && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  {/* Analytics Hub */}
                  <div className="w-full max-w-4xl mx-auto flex flex-col items-center mt-4">
                    <header className="mb-10 flex flex-col items-center text-center border-b-4 border-black pb-4 w-full">
                      <h2 className="font-hero-xl text-hero-xl-mobile md:text-hero-xl text-black uppercase drop-shadow-[4px_4px_0px_#C9A8FF] leading-none">
                        Analytics Hub
                      </h2>
                      <p className="font-body-lg text-body-lg text-on-surface-variant mt-4 bg-white border-2 border-black px-6 py-2 inline-block rounded-full brutalist-shadow-sm rotate-[-1deg] uppercase font-bold">
                        Your Brain Stats, Brutally Exposed
                      </p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full mb-8">
                      {/* Left: Accuracy categories */}
                      <section className="col-span-1 md:col-span-4 flex flex-col gap-6">
                        <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow flex flex-col justify-between h-full">
                          <div className="flex items-center gap-2 mb-6 border-b-2 border-black pb-2">
                            <span className="material-symbols-outlined text-[28px] fill-icon">target</span>
                            <h3 className="font-heading-md text-[24px] uppercase text-black">Accuracy</h3>
                          </div>
                          <div className="space-y-4">
                            {accuracyStats.map((stat, index) => (
                              <div key={stat.topic} className="group">
                                <div className="flex justify-between font-label-bold text-[12px] mb-1 uppercase">
                                  <span>{stat.topic}</span>
                                  <span>
                                    {stat.answered
                                      ? stat.correct
                                        ? "CORRECT (100%)"
                                        : "INCORRECT (0%)"
                                      : "UNANSWERED"}
                                  </span>
                                </div>
                                <div className="h-7 w-full bg-surface-container border-2 border-black rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full border-r-2 border-black transition-all duration-1000 group-hover:bg-rocket-orange",
                                      stat.answered ? (stat.correct ? "bg-primary-container" : "bg-error-red") : "bg-secondary-container"
                                    )}
                                    style={{ width: stat.answered ? "100%" : "0%" }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>

                      {/* Center: Pace wave chart */}
                      <section className="col-span-1 md:col-span-4 flex flex-col gap-6">
                        <div className="bg-sticker-purple border-4 border-black rounded-poster p-6 brutalist-shadow flex flex-col justify-between h-full group">
                          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
                            <h3 className="font-heading-md text-[24px] uppercase text-black">Pace</h3>
                            <span className="bg-white border-2 border-black px-3 py-0.5 rounded-full font-label-bold text-label-bold text-black brutalist-shadow-sm uppercase">
                              Avg: {avgPace}s
                            </span>
                          </div>
                          <div className="h-52 w-full mt-auto select-none">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={paceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.15)" />
                                <XAxis dataKey="name" tick={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }} />
                                <YAxis tickFormatter={(val) => `${val}s`} tick={{ fill: '#000', fontSize: 10 }} />
                                <Tooltip formatter={(value) => [`${value}s`, "Response Time"]} />
                                <Bar dataKey="pace" radius={[4, 4, 0, 0]}>
                                  {paceData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={entry.pace === 0 ? "#ffffff" : entry.correct ? "#83f9bd" : "#FF5050"}
                                      stroke="#000"
                                      strokeWidth={2}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </section>

                      {/* Right: Trophy Room */}
                      <section className="col-span-1 md:col-span-4 h-full">
                        <div className="bg-surface-bright border-4 border-black rounded-poster p-6 brutalist-shadow flex flex-col justify-between h-full">
                          <div className="flex items-center justify-between pb-3 border-b-4 border-black mb-6">
                            <h3 className="font-heading-md text-[24px] uppercase text-black">Trophy Room</h3>
                            <span className="material-symbols-outlined text-emoji-yellow text-[32px] fill-icon">workspace_premium</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 flex-1 items-center">
                            {/* Fast Thinker Sticker */}
                            <div
                              className={cn(
                                "border-4 border-black rounded-xl p-3 flex flex-col items-center justify-center text-center brutalist-shadow-sm sticker-float transition-all",
                                currentPlayer && currentPlayer.score > 1500 ? "bg-white opacity-100" : "bg-surface-container opacity-40 border-dashed"
                              )}
                              style={{ animationDelay: "0s" }}
                            >
                              <div className="w-10 h-10 bg-electric-blue rounded-full border-2 border-black flex items-center justify-center mb-2 shadow-[2px_2px_0px_#000]">
                                <span className="material-symbols-outlined text-white text-[20px]">bolt</span>
                              </div>
                              <span className="font-label-bold text-[10px] text-black uppercase">Fast Thinker</span>
                            </div>

                            {/* Streak Master Sticker */}
                            <div
                              className={cn(
                                "border-4 border-black rounded-xl p-3 flex flex-col items-center justify-center text-center brutalist-shadow-sm sticker-float transition-all",
                                currentPlayer && currentPlayer.streak >= 3 ? "bg-white opacity-100" : "bg-surface-container opacity-40 border-dashed"
                              )}
                              style={{ animationDelay: "0.5s" }}
                            >
                              <div className="w-10 h-10 bg-rocket-orange rounded-full border-2 border-black flex items-center justify-center mb-2 shadow-[2px_2px_0px_#000]">
                                <span className="material-symbols-outlined text-white text-[20px]">local_fire_department</span>
                              </div>
                              <span className="font-label-bold text-[10px] text-black uppercase">Streak Master</span>
                            </div>

                            {/* Nerd King Sticker */}
                            <div
                              className={cn(
                                "border-4 border-black rounded-xl p-3 flex flex-col items-center justify-center text-center brutalist-shadow-sm sticker-float transition-all",
                                currentPlayer && currentPlayer.score > 3500 ? "bg-white opacity-100" : "bg-surface-container opacity-40 border-dashed"
                              )}
                              style={{ animationDelay: "1s" }}
                            >
                              <div className="w-10 h-10 bg-primary-container rounded-full border-2 border-black flex items-center justify-center mb-2 shadow-[2px_2px_0px_#000]">
                                <span className="material-symbols-outlined text-black text-[20px]">school</span>
                              </div>
                              <span className="font-label-bold text-[10px] text-black uppercase">Nerd King</span>
                            </div>

                            {/* Champion Sticker */}
                            <div
                              className={cn(
                                "border-4 border-black rounded-xl p-3 flex flex-col items-center justify-center text-center brutalist-shadow-sm sticker-float transition-all",
                                snapshot.leaderboard[0]?.id === currentPlayer?.id && snapshot.room.status === "ended" ? "bg-white opacity-100" : "bg-surface-container opacity-40 border-dashed"
                              )}
                              style={{ animationDelay: "1.5s" }}
                            >
                              <div className="w-10 h-10 bg-emoji-yellow rounded-full border-2 border-black flex items-center justify-center mb-2 shadow-[2px_2px_0px_#000]">
                                <span className="material-symbols-outlined text-black text-[20px]">workspace_premium</span>
                              </div>
                              <span className="font-label-bold text-[10px] text-black uppercase">Champion</span>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "activity" && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                >
                  {/* Console View */}
                  <div className="w-full max-w-5xl mx-auto grid gap-6 lg:grid-cols-[1.1fr_0.9fr] mt-4">
                    <div className="flex flex-col gap-6">
                      
                      {/* Room details info card */}
                      <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow">
                        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                          <div>
                            <p className="font-label-bold text-label-bold text-on-surface-variant uppercase">Current Session</p>
                            <p className="font-heading-md text-heading-md text-black">Room {snapshot.room.code}</p>
                          </div>
                          <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-black bg-primary-container font-heading-md text-[24px] shadow-[3px_3px_0px_#000]">
                            {initials(currentPlayer.username)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-surface-container border-2 border-black p-4 rounded-xl shadow-[2px_2px_0px_#000]">
                            <p className="font-small text-small text-secondary uppercase leading-none">Players online</p>
                            <p className="font-heading-md text-[28px] text-black mt-1 leading-none">{snapshot.players.length}</p>
                          </div>
                          <div className="bg-surface-container border-2 border-black p-4 rounded-xl shadow-[2px_2px_0px_#000]">
                            <p className="font-small text-small text-secondary uppercase leading-none">Valkey Mode</p>
                            <p className="font-heading-md text-[20px] text-black mt-2 leading-none uppercase">
                              {runtime?.valkeyMode === "valkey" ? "Valkey live" : "Memory fallback"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Valkey Primitives checklists */}
                      <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow">
                        <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                          <span className="material-symbols-outlined text-[28px] text-rocket-orange">database</span>
                          <h3 className="font-heading-md text-[24px] uppercase text-black">Valkey Primitives status</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {["Hash", "Set", "Sorted Set", "Stream", "Pub/Sub", "TTL", "Atomic Update"].map((prim) => {
                            const active = snapshot.events.some((e) => e.primitive === prim);
                            return (
                              <div
                                key={prim}
                                className={cn(
                                  "border-2 border-black rounded-xl p-3 font-label-bold text-label-bold uppercase flex items-center justify-between brutalist-shadow-sm select-none",
                                  active ? "bg-primary-container text-black border-black" : "bg-white text-secondary/60 border-black/20"
                                )}
                              >
                                <span>{prim}</span>
                                {active ? (
                                  <span className="material-symbols-outlined text-black font-black text-[18px]">check_circle</span>
                                ) : (
                                  <span className="material-symbols-outlined text-secondary/40 text-[18px]">hourglass_empty</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* AI Agent Panel */}
                      <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow">
                        <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                          <span className="material-symbols-outlined text-[28px] text-sticker-purple fill-icon">smart_toy</span>
                          <h3 className="font-heading-md text-[24px] uppercase text-black">AI agent insights</h3>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                          {snapshot.insights.length === 0 ? (
                            <p className="font-body-md text-body-md text-on-surface-variant bg-surface-container p-4 rounded-xl border-2 border-dashed border-black/10 text-center">
                              Insights appear here dynamically as gameplay transitions.
                            </p>
                          ) : (
                            snapshot.insights.map((insight, idx) => (
                              <div key={idx} className="bg-surface-container border-2 border-black p-4 rounded-xl shadow-[2px_2px_0px_#000]">
                                <div className="flex items-center justify-between border-b border-black/10 pb-1 mb-2">
                                  <span className="font-label-bold text-[12px] text-rocket-orange uppercase">{insight.agent}</span>
                                  <span className="bg-white border border-black px-2 py-0.5 rounded-full text-[10px] uppercase font-bold text-black select-none">
                                    {insight.tone}
                                  </span>
                                </div>
                                <p className="font-body-md text-body-md text-black leading-relaxed">{insight.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Valkey stream logs feed */}
                    <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                        <span className="material-symbols-outlined text-[28px] text-emoji-yellow fill-icon">rss_feed</span>
                        <h3 className="font-heading-md text-[24px] uppercase text-black">Valkey Stream activity log</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto max-h-[520px] space-y-3 pr-2 scrollbar-thin">
                        {snapshot.events.length === 0 ? (
                          <p className="font-body-md text-body-md text-on-surface-variant bg-surface-container p-4 rounded-xl border-2 border-dashed border-black/10 text-center">
                            Awaiting events from Valkey stream...
                          </p>
                        ) : (
                          snapshot.events.map((event) => (
                            <div key={event.id} className="bg-white border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_#000]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-label-bold text-[12px] text-electric-blue uppercase leading-none">{event.type}</span>
                                <span className="bg-sticker-purple border border-black px-2 py-0.5 rounded text-[10px] font-bold text-black uppercase leading-none">
                                  {event.primitive}
                                </span>
                              </div>
                              <p className="font-body-md text-body-md text-black leading-relaxed">{event.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t-4 border-black shadow-[0px_-4px_0px_#000] z-50 flex justify-around items-center py-2 pb-safe select-none">
              {tabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "flex flex-col items-center p-2 text-on-surface-variant transition-colors relative",
                      isActive ? "text-black" : "hover:text-black"
                    )}
                  >
                    {isActive ? (
                      <>
                        <div className={cn("absolute -top-7 p-2 rounded-full border-2 border-black shadow-[2px_2px_0px_#000] z-10", t.color)}>
                          <span className="material-symbols-outlined text-[24px] fill-icon block">
                            {t.icon}
                          </span>
                        </div>
                        <span className="font-label-bold text-[10px] mt-6 font-bold uppercase">{t.label}</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[24px] block">
                          {t.icon}
                        </span>
                        <span className="font-small text-[10px] mt-1 uppercase">{t.label}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </main>
  );
}
