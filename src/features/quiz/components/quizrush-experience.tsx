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
import { cn, formatRoomCode, initials } from "@/lib/utils";

const clientDemoQuiz = [
  { id: "q-valkey-1", topic: "Sorted Sets" },
  { id: "q-valkey-2", topic: "Streams" },
  { id: "q-valkey-3", topic: "Pub/Sub" },
  { id: "q-valkey-4", topic: "TTL" },
];
import confetti from "canvas-confetti";
import { AuthView } from "./views/AuthView";
import { LobbyView } from "./views/LobbyView";
import { PlayView } from "./views/PlayView";
import { LeaderboardView } from "./views/LeaderboardView";
import { AnalyticsView } from "./views/AnalyticsView";
import { ActivityFeed } from "./views/ActivityFeed";

export type RuntimeStatus = {
  valkeyMode: "valkey" | "memory";
  ttlSeconds: number;
  primitives: ValkeyPrimitive[];
};

export type AuthMode = "guest" | "login" | "register";

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
  const [activeTab, setActiveTab] = useState<"play" | "leagues" | "analytics">("play");
  const [showConsole, setShowConsole] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [globalEvents, setGlobalEvents] = useState<any[]>([]);

  const fetchActiveRooms = useCallback(async () => {
    try {
      const data = await getJson<{ rooms: any[]; globalEvents: any[] }>("/api/active-rooms");
      setActiveRooms(data.rooms || []);
      setGlobalEvents(data.globalEvents || []);
    } catch (e) {
      console.warn("Failed to fetch active rooms:", e);
    }
  }, []);

  // Handle back gesture / history popstate
  useEffect(() => {
    const handlePopState = async () => {
      if (snapshot) {
        setSnapshot(null);
        setRoomInput("");
      } else if (player) {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch (e) {}
        setPlayer(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [snapshot, player, setPlayer]);

  // Sync state with history
  useEffect(() => {
    if (snapshot || player) {
      window.history.pushState({ active: true }, "");
    }
  }, [snapshot, player]);

  useEffect(() => {
    if (!player || snapshot) return;
    fetchActiveRooms();
    const interval = window.setInterval(fetchActiveRooms, 2000);
    return () => window.clearInterval(interval);
  }, [player, snapshot, fetchActiveRooms]);

  useEffect(() => {
    getJson<{ session: Player }>("/api/auth/me")
      .then((data) => {
        if (data.session) {
          setPlayer(data.session);
          getJson<{ history: any[] }>("/api/history")
            .then((hData) => setHistory(hData.history))
            .catch(() => {});
        }
        const savedRoom = localStorage.getItem("quizrush_room");
        if (savedRoom) setRoomInput(savedRoom);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (roomInput) {
      localStorage.setItem("quizrush_room", roomInput);
    } else {
      localStorage.removeItem("quizrush_room");
    }
  }, [roomInput]);

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
    try {
      const data = await getJson<{ snapshot: RoomSnapshot }>(`/api/rooms/${encodeURIComponent(code)}`);
      setSnapshot(data.snapshot);
    } catch (err) {
      setRoomInput("");
      setSnapshot(null);
    }
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

  const manageRoom = useCallback(async (code: string) => {
    await runAction("manage-room", async () => {
      const data = await getJson<{ snapshot: RoomSnapshot }>(`/api/rooms/${encodeURIComponent(code)}`);
      setSnapshot(data.snapshot);
      setRoomInput(code);
      setActiveTab("play");
      return data;
    });
  }, [runAction]);

  const startRoom = useCallback(async (code: string) => {
    await runAction("start-room", async () => {
      const data = await postJson<{ snapshot: RoomSnapshot }>("/api/game/start", { roomCode: code });
      setSnapshot(data.snapshot);
      setRoomInput(code);
      setActiveTab("play");
      return data;
    });
  }, [runAction]);

  const endRoom = useCallback(async (code: string) => {
    await runAction("end-room", async () => {
      const data = await postJson<{ snapshot: RoomSnapshot }>("/api/game/end", { roomCode: code });
      if (snapshot?.room.code === code) {
        setSnapshot(data.snapshot);
      }
      fetchActiveRooms();
      return data;
    });
  }, [runAction, snapshot, fetchActiveRooms]);

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
      getJson<{ history: any[] }>("/api/history")
        .then((hData) => setHistory(hData.history))
        .catch(() => {});
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

  async function kickPlayer(playerId: string) {
    if (!roomCode) return;
    await runAction("kick", () =>
      postJson(`/api/rooms/${roomCode}/kick`, { playerId })
    );
  }

  async function pauseGame() {
    if (!roomCode) return;
    await runAction("pause", () =>
      postJson(`/api/rooms/${roomCode}/pause`)
    );
  }

  async function resumeGame() {
    if (!roomCode) return;
    await runAction("resume", () =>
      postJson(`/api/rooms/${roomCode}/resume`)
    );
  }

  async function lockRoom() {
    if (!roomCode) return;
    await runAction("lock", () =>
      postJson(`/api/rooms/${roomCode}/lock`)
    );
  }

  async function unlockRoom() {
    if (!roomCode) return;
    await runAction("unlock", () =>
      postJson(`/api/rooms/${roomCode}/unlock`)
    );
  }

  async function endGame() {
    if (!roomCode) return;
    const result = await runAction("end", () =>
      postJson<{ snapshot: RoomSnapshot }>("/api/game/end", { roomCode })
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
        Question: `${snapshot?.room.currentQuestionIndex ?? 0 + 1} / ${clientDemoQuiz.length}`,
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
    if (snapshot?.room.status === "ended") {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#2E5BFF", "#FF6720", "#C9A8FF", "#FFD938", "#83f9bd"]
      });
      if (player && !player.isGuest) {
        getJson<{ history: any[] }>("/api/history")
          .then((hData) => setHistory(hData.history))
          .catch(() => {});
      }
    }
  }, [snapshot?.room.status, player]);

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
    return clientDemoQuiz.map((q) => {
      const ans = myAnswers.find((a) => a.questionId === q.id);
      return {
        topic: q.topic,
        answered: !!ans,
        correct: ans ? ans.correct : false,
        percentage: ans ? (ans.correct ? 100 : 0) : 0,
      };
    });
  }, [myAnswers]);

  const paceData = useMemo(() => {
    return clientDemoQuiz.map((q) => {
      const ans = myAnswers.find((a) => a.questionId === q.id);
      return {
        name: q.topic,
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
    <main className="min-h-screen pb-24 md:pb-8 pt-6 px-4 pattern-bg relative">
      {/* Floating Top Navigation (visible globally) */}
      <div className="fixed top-0 left-0 w-full z-50 p-2 md:p-4 flex justify-center pointer-events-none">
        <nav className="pointer-events-auto flex items-center justify-between lg:justify-start gap-2 md:gap-4 bg-white border-4 border-black rounded-[40px] px-4 md:px-6 py-3 flex-wrap brutalist-shadow w-[95%] max-w-5xl min-h-[64px] transition-all">
          {/* Logo */}
          <a
            href="/"
            className="font-heading-md text-[20px] md:text-[28px] text-rocket-orange uppercase tracking-tighter mr-4 md:mr-6 cursor-pointer hover:opacity-80 transition-[opacity,transform] duration-150 active:scale-95 flex-shrink-0 bg-transparent border-none outline-none focus-visible:outline-2 focus-visible:outline-black no-underline"
          >
            <span className="mr-2">Quiz</span><span>Rush</span>
          </a>

          {/* Live Notification Banner */}
          <div className="hidden md:flex items-center gap-2 bg-white border-2 border-black rounded-full px-4 py-1.5 shadow-[2px_2px_0px_#000] mr-auto">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-red opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-error-red"></span>
            </span>
            <span className="font-label-bold text-[12px] text-error-red uppercase tracking-wider font-black">
              {activeRooms.length} Live Room{activeRooms.length !== 1 ? 's' : ''}
            </span>
          </div>

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
                      "px-4 py-2 rounded-full transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] flex items-center gap-1.5 font-label-bold text-label-bold group uppercase border-2 border-transparent cursor-pointer active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-black",
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
          <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
            {currentPlayer ? (
              <>
                {snapshot ? (
                  <>
                    {/* Score Coin */}
                    <div className="bg-emoji-yellow border-2 border-black rounded-full px-2.5 py-1 flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] active:translate-y-0 active:shadow-[0px_0px_0px_#000] transition-transform">
                      <span className="material-symbols-outlined fill-icon text-[16px] md:text-[18px]">monetization_on</span>
                      <span className="font-label-bold text-[11px] md:text-[13px] text-black">{currentPlayer.score}</span>
                    </div>

                    {/* Streak Diamond */}
                    <div className="bg-sticker-purple border-2 border-black rounded-full px-2.5 py-1 flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] active:translate-y-0 active:shadow-[0px_0px_0px_#000] transition-transform">
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
                <div className="font-label-bold text-label-bold text-on-surface border-2 border-black px-3.5 py-1.5 rounded-full shadow-[2px_2px_0px_#000] bg-white cursor-default hidden md:block uppercase flex-shrink-0" title={currentPlayer.username}>
                  {currentPlayer.username}
                </div>
              </>
            ) : (
              /* Guest/Home state - show live Valkey mode */
              <div className="bg-emoji-yellow border-2 border-black rounded-full px-3 py-1 flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] active:translate-y-0 active:shadow-[0px_0px_0px_#000] transition-transform">
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
          {error && currentPlayer && (
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
        {!currentPlayer ?  ( <AuthView authMode={authMode} setAuthMode={setAuthMode} username={username} setUsername={setUsername} email={email} setEmail={setEmail} password={password} setPassword={setPassword} authenticate={authenticate} loading={loading} error={error} /> )  : !snapshot ?  ( <LobbyView currentPlayer={currentPlayer} createRoom={createRoom} joinRoom={joinRoom} loading={loading} roomInput={roomInput} setRoomInput={setRoomInput} history={history} activeRooms={activeRooms} globalEvents={globalEvents} manageRoom={manageRoom} startRoom={startRoom} endRoom={endRoom} /> )  : (
          /* Active Room Tabbed Dashboard */
          <div className="w-full">
            <AnimatePresence mode="wait">
              {activeTab === "play" &&  ( <PlayView username={username} loading={loading} error={error} createRoom={createRoom} setRoomInput={setRoomInput} snapshot={snapshot} isHost={isHost} startGame={startGame} revealQuestion={revealQuestion} advanceGame={advanceGame} answer={answer} selected={selected} setSnapshot={setSnapshot} setActiveTab={setActiveTab} currentQuestion={currentQuestion} remainingMs={remainingMs} currentQuestionProgress={currentQuestionProgress} hasAnswered={hasAnswered} selectedForCurrentQuestion={selectedForCurrentQuestion} questionStartedAt={questionStartedAt} now={now} currentPlayer={currentPlayer} kickPlayer={kickPlayer} pauseGame={pauseGame} resumeGame={resumeGame} endGame={endGame} lockRoom={lockRoom} unlockRoom={unlockRoom} /> ) }

              {activeTab === "leagues" &&  ( <LeaderboardView snapshot={snapshot} currentPlayer={currentPlayer} /> ) }

              {activeTab === "analytics" &&  ( <AnalyticsView snapshot={snapshot} currentPlayer={currentPlayer} myAnswers={myAnswers} accuracyStats={accuracyStats} paceData={paceData} avgPace={avgPace} /> ) }
            </AnimatePresence>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t-4 border-black shadow-[0px_-4px_0px_#000] z-50 flex justify-around items-center py-2 pb-safe">
              {tabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className="flex-grow min-h-[64px] flex flex-col items-center justify-center relative text-on-surface-variant cursor-pointer focus-visible:outline-2 focus-visible:outline-black"
                    aria-label={`Go to ${t.label}`}
                  >
                    {isActive ? (
                      <div className="flex flex-col items-center">
                        <div className={cn("absolute -top-6 p-2.5 rounded-full border-2 border-black shadow-[2px_2px_0px_#000] z-10 transition-transform active:scale-95 duration-100", t.color)}>
                          <span className="material-symbols-outlined text-[26px] fill-icon block">
                            {t.icon}
                          </span>
                        </div>
                        <span className="font-label-bold text-[10px] mt-6 font-bold uppercase">{t.label}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center opacity-70 hover:opacity-100 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-[24px] block">
                          {t.icon}
                        </span>
                        <span className="font-small text-[10px] mt-0.5 uppercase">{t.label}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Floating Console Toggle */}
      {currentPlayer && snapshot && (
        <button
          onClick={() => setShowConsole(prev => !prev)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full border-4 border-black bg-primary-container flex items-center justify-center brutalist-shadow brutalist-shadow-hover cursor-pointer active:scale-[0.95] active:translate-y-0 transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2 pointer-events-auto"
          title="Toggle Valkey Console"
        >
          <span className="material-symbols-outlined font-black text-black text-[28px]">
            {showConsole ? "close" : "terminal"}
          </span>
        </button>
      )}

      {/* Slide-out Console Drawer */}
      <AnimatePresence>
        {showConsole && currentPlayer && snapshot && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConsole(false)}
              className="fixed inset-0 bg-black z-40 cursor-pointer pointer-events-auto"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[640px] lg:w-[720px] bg-[#f5fbf4] border-l-4 border-black z-40 p-6 overflow-y-auto pointer-events-auto shadow-2xl flex flex-col pt-24"
            >
              <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[32px] text-rocket-orange">terminal</span>
                  <h2 className="font-heading-md text-[28px] uppercase text-black">Valkey Live Console</h2>
                </div>
                <button
                  onClick={() => setShowConsole(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white transition-[transform,background-color] duration-150 hover:translate-y-[-2px] active:scale-95 brutalist-shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined font-black text-black">close</span>
                </button>
              </div>
              <div className="flex-1">
                <ActivityFeed
                  currentPlayer={currentPlayer}
                  snapshot={snapshot}
                  runtime={runtime}
                  resumeGame={resumeGame}
                  endGame={endGame}
                  lockRoom={lockRoom}
                  unlockRoom={unlockRoom}
                  displayedSocketState={displayedSocketState}
                  roomCode={roomCode}
                  formatRoomCode={formatRoomCode}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
