"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  Crown,
  Download,
  LogIn,
  PartyPopper,
  Play,
  Radio,
  Rocket,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
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
import { answerOptions } from "@/lib/demo-quiz";
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

function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[24px] bg-[#231942] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-purple-950/20 transition hover:-translate-y-0.5 hover:bg-[#352267] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0",
        className,
      )}
    >
      {children}
    </button>
  );
}

function SoftButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[24px] border border-white/80 bg-white/70 px-4 py-3 text-sm font-bold text-[#33275f] shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0",
        className,
      )}
    >
      {children}
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-12 w-full rounded-[24px] border border-white/80 bg-white/76 px-4 text-sm font-semibold text-[#233044] shadow-inner shadow-purple-100/70 placeholder:text-slate-400",
        props.className,
      )}
    />
  );
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

  async function runAction<T>(name: string, action: () => Promise<T>) {
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
  }

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

  async function answer(option: AnswerOption) {
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
  }

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

  return (
    <main className="min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <TopBar runtime={runtime} socketState={displayedSocketState} player={currentPlayer} />

        <AnimatePresence>
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[24px] border border-red-200 bg-white/82 px-4 py-3 text-sm font-bold text-red-700 soft-shadow"
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!currentPlayer ? (
          <AuthPanel
            authMode={authMode}
            setAuthMode={setAuthMode}
            username={username}
            setUsername={setUsername}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            authenticate={authenticate}
            loading={loading === "auth"}
          />
        ) : !snapshot ? (
          <RoomLauncher
            player={currentPlayer}
            roomInput={roomInput}
            setRoomInput={setRoomInput}
            createRoom={createRoom}
            joinRoom={joinRoom}
            loading={loading}
          />
        ) : (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-5">
              <GameStage
                snapshot={snapshot}
                currentPlayer={currentPlayer}
                isHost={isHost}
                selected={selectedForCurrentQuestion}
                hasAnswered={hasAnswered}
                remainingMs={remainingMs}
                answer={answer}
                startGame={startGame}
                revealQuestion={revealQuestion}
                advanceGame={advanceGame}
                loading={loading}
              />
              <div className="grid gap-5 xl:grid-cols-2">
                <AnswerDistribution snapshot={snapshot} />
                <Leaderboard snapshot={snapshot} />
              </div>
            </div>
            <aside className="flex flex-col gap-5">
              <RoomCard snapshot={snapshot} currentPlayer={currentPlayer} isHost={isHost} />
              <AgentPanel snapshot={snapshot} />
              <ValkeyProof runtime={runtime} events={snapshot.events} />
              <ActivityFeed events={snapshot.events} />
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}

function TopBar({
  runtime,
  socketState,
  player,
}: {
  runtime: RuntimeStatus | null;
  socketState: "idle" | "connected" | "fallback";
  player: Player | null;
}) {
  return (
    <header className="surface soft-shadow flex flex-wrap items-center justify-between gap-4 rounded-[32px] px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="animated-rainbow flex h-12 w-12 items-center justify-center rounded-[20px] text-sm font-black text-[#231942]">
          QR
        </div>
        <div>
          <p className="text-xs font-black uppercase text-[#7a67c7]">Valkey Hackathon Arena</p>
          <h1 className="playful-title text-2xl text-[#231942] sm:text-3xl">QuizRush</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill
          icon={runtime?.valkeyMode === "valkey" ? <Radio size={15} /> : <ShieldCheck size={15} />}
          label={runtime?.valkeyMode === "valkey" ? "Valkey live" : "Memory demo"}
        />
        <StatusPill
          icon={socketState === "connected" ? <Wifi size={15} /> : <WifiOff size={15} />}
          label={socketState === "connected" ? "WebSocket live" : "Polling fallback"}
        />
        {player ? <StatusPill icon={<Sparkles size={15} />} label={player.username} /> : null}
      </div>
    </header>
  );
}

function StatusPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-[24px] bg-white/72 px-3 py-2 text-xs font-black text-[#44366f] shadow-sm">
      {icon}
      {label}
    </span>
  );
}

function AuthPanel(props: {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  username: string;
  setUsername: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  authenticate: () => void;
  loading: boolean;
}) {
  return (
    <section className="grid min-h-[70vh] items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="max-w-3xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-[24px] bg-white/70 px-4 py-2 text-sm font-black text-[#5c45a8]">
          <Zap size={17} />
          Live quiz rooms, instant ranks, Valkey proof built in
        </div>
        <h2 className="playful-title max-w-3xl text-5xl leading-tight text-[#231942] sm:text-6xl lg:text-7xl">
          A multiplayer quiz arena that feels alive.
        </h2>
        <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-[#526078]">
          Create a room, bring in players, launch timed questions, and watch scores,
          charts, achievements, and Valkey events update as the game unfolds.
        </p>
        <div className="mt-7 grid max-w-xl grid-cols-3 gap-3">
          {[
            ["Pub/Sub", "broadcasts"],
            ["Streams", "proof trail"],
            ["ZSET", "rankings"],
          ].map(([title, caption]) => (
            <div className="surface rounded-[24px] px-4 py-4 text-center soft-shadow" key={title}>
              <p className="text-lg font-black text-[#231942]">{title}</p>
              <p className="text-xs font-bold text-[#667085]">{caption}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface soft-shadow rounded-[32px] p-5 sm:p-7">
        <div className="mb-5 flex rounded-[24px] bg-[#f3efff] p-1">
          {(["guest", "login", "register"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => props.setAuthMode(mode)}
              className={cn(
                "flex-1 rounded-[20px] px-3 py-3 text-sm font-black capitalize text-[#5e527e] transition",
                props.authMode === mode && "bg-white text-[#231942] shadow-sm",
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <TextInput
            placeholder={props.authMode === "guest" ? "Display name, optional" : "Username, optional"}
            value={props.username}
            onChange={(event) => props.setUsername(event.target.value)}
          />
          {props.authMode !== "guest" ? (
            <>
              <TextInput
                type="email"
                placeholder="Email"
                value={props.email}
                onChange={(event) => props.setEmail(event.target.value)}
              />
              <TextInput
                type="password"
                placeholder="Password"
                value={props.password}
                onChange={(event) => props.setPassword(event.target.value)}
              />
            </>
          ) : null}
          <PrimaryButton onClick={props.authenticate} disabled={props.loading} className="w-full">
            <LogIn size={18} />
            {props.loading ? "Entering arena..." : "Enter QuizRush"}
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}

function RoomLauncher(props: {
  player: Player;
  roomInput: string;
  setRoomInput: (value: string) => void;
  createRoom: () => void;
  joinRoom: () => void;
  loading: string | null;
}) {
  return (
    <section className="grid min-h-[70vh] items-center gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="surface soft-shadow rounded-[32px] p-6">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#b8f2e6] text-xl font-black text-[#174a43]">
          {initials(props.player.username)}
        </div>
        <h2 className="playful-title text-4xl text-[#231942]">Ready, {props.player.username}?</h2>
        <p className="mt-3 text-base font-semibold leading-7 text-[#667085]">
          Host a judge-friendly Valkey demo room or jump into a room code from another browser.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="surface soft-shadow rounded-[32px] p-6">
          <Crown className="mb-5 text-[#b892ff]" size={32} />
          <h3 className="text-2xl font-black text-[#231942]">Host a room</h3>
          <p className="mt-2 min-h-14 text-sm font-semibold leading-6 text-[#667085]">
            Creates a TTL-backed room, adds you to the membership Set, and opens the lobby.
          </p>
          <PrimaryButton
            onClick={props.createRoom}
            disabled={props.loading === "create-room"}
            className="mt-5 w-full"
          >
            <Rocket size={18} />
            Create room
          </PrimaryButton>
        </div>

        <div className="surface soft-shadow rounded-[32px] p-6">
          <Users className="mb-5 text-[#ff9f9f]" size={32} />
          <h3 className="text-2xl font-black text-[#231942]">Join a room</h3>
          <p className="mt-2 min-h-14 text-sm font-semibold leading-6 text-[#667085]">
            Adds your player hash to the room membership Set and live leaderboard.
          </p>
          <TextInput
            placeholder="QR-7421"
            value={props.roomInput}
            onChange={(event) => props.setRoomInput(formatRoomCode(event.target.value))}
            className="mt-5 uppercase"
          />
          <SoftButton
            onClick={props.joinRoom}
            disabled={props.loading === "join-room"}
            className="mt-3 w-full"
          >
            <ArrowRight size={18} />
            Join room
          </SoftButton>
        </div>
      </div>
    </section>
  );
}

function GameStage(props: {
  snapshot: RoomSnapshot;
  currentPlayer: Player;
  isHost: boolean;
  selected: AnswerOption | null;
  hasAnswered: boolean;
  remainingMs: number;
  answer: (option: AnswerOption) => void;
  startGame: () => void;
  revealQuestion: () => void;
  advanceGame: () => void;
  loading: string | null;
}) {
  const { snapshot } = props;
  const question = snapshot.currentQuestion;
  const progress = question
    ? Math.max(0, Math.min(100, (props.remainingMs / question.durationMs) * 100))
    : 0;

  return (
    <section className="surface soft-shadow rounded-[36px] p-5 sm:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[#7a67c7]">
            Room {snapshot.room.code} · {snapshot.room.status}
          </p>
          <h2 className="playful-title mt-1 text-3xl text-[#231942] sm:text-4xl">
            {snapshot.room.status === "lobby"
              ? "Lobby is warming up"
              : snapshot.room.status === "ended"
                ? "Winner reveal"
                : `Question ${snapshot.room.currentQuestionIndex + 1}`}
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-[24px] bg-[#fff4d3] px-4 py-3 text-sm font-black text-[#705b00]">
          <Timer size={18} />
          {snapshot.room.status === "live" ? `${Math.ceil(props.remainingMs / 1000)}s` : "Host paced"}
        </div>
      </div>

      {snapshot.room.status === "lobby" ? (
        <LobbyState snapshot={snapshot} isHost={props.isHost} startGame={props.startGame} loading={props.loading} />
      ) : null}

      {question && snapshot.room.status !== "lobby" && snapshot.room.status !== "ended" ? (
        <div>
          <div className="mb-5 h-3 overflow-hidden rounded-full bg-[#efe9ff]">
            <motion.div
              className={cn("h-full rounded-full", props.remainingMs < 5000 ? "bg-[#ff9f9f]" : "animated-rainbow")}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
            />
          </div>

          <h3 className="max-w-4xl text-2xl font-black leading-tight text-[#231942] sm:text-4xl">
            {question.prompt}
          </h3>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {answerOptions.map((option) => {
              const chosen = props.selected === option;
              const isCorrect = snapshot.room.status === "reveal" && option === question.correctAnswer;
              return (
                <motion.button
                  layout
                  key={option}
                  disabled={snapshot.room.status !== "live" || props.hasAnswered || props.loading === "answer"}
                  onClick={() => props.answer(option)}
                  className={cn(
                    "min-h-24 rounded-[28px] border border-white/80 bg-white/82 p-4 text-left shadow-sm transition hover:-translate-y-1 disabled:hover:translate-y-0",
                    chosen && "ring-4 ring-[#b892ff]/35",
                    isCorrect && "bg-[#dffcf5] ring-4 ring-[#4fd1bd]/35",
                  )}
                >
                  <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[18px] bg-[#231942] text-sm font-black text-white">
                    {option}
                  </span>
                  <span className="block text-base font-black text-[#2b2448]">{question.options[option]}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {props.hasAnswered ? (
              <span className="inline-flex items-center gap-2 rounded-[24px] bg-[#e8fff9] px-4 py-3 text-sm font-black text-[#176358]">
                <Check size={18} />
                Answer locked
              </span>
            ) : null}
            {props.isHost && snapshot.room.status === "live" ? (
              <SoftButton onClick={props.revealQuestion} disabled={props.loading === "reveal"}>
                <BarChart3 size={18} />
                Reveal distribution
              </SoftButton>
            ) : null}
            {props.isHost && snapshot.room.status === "reveal" ? (
              <PrimaryButton onClick={props.advanceGame} disabled={props.loading === "advance"}>
                <Play size={18} />
                Next moment
              </PrimaryButton>
            ) : null}
          </div>
        </div>
      ) : null}

      {snapshot.room.status === "ended" ? (
        <FinalState snapshot={snapshot} />
      ) : null}
    </section>
  );
}

function LobbyState({
  snapshot,
  isHost,
  startGame,
  loading,
}: {
  snapshot: RoomSnapshot;
  isHost: boolean;
  startGame: () => void;
  loading: string | null;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[1fr_240px]">
      <div>
        <p className="text-lg font-semibold leading-8 text-[#667085]">
          Share <span className="font-black text-[#231942]">{snapshot.room.code}</span> with players.
          Joins are written to a Valkey Set and mirrored in the activity stream.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {snapshot.players.map((player) => (
            <motion.div
              layout
              key={player.id}
              className="flex items-center gap-3 rounded-[24px] bg-white/82 px-4 py-3 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-[#b8f2e6] text-xs font-black text-[#174a43]">
                {initials(player.username)}
              </span>
              <span className="font-black text-[#2b2448]">{player.username}</span>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="rounded-[28px] bg-[#f4efff] p-4 text-center">
        <p className="text-5xl font-black text-[#231942]">{snapshot.players.length}</p>
        <p className="text-sm font-bold text-[#667085]">players ready</p>
        {isHost ? (
          <PrimaryButton onClick={startGame} disabled={loading === "start-game"} className="mt-5 w-full">
            <Play size={18} />
            Start quiz
          </PrimaryButton>
        ) : (
          <p className="mt-5 text-sm font-bold text-[#6f628c]">Waiting for host launch.</p>
        )}
      </div>
    </div>
  );
}

function FinalState({ snapshot }: { snapshot: RoomSnapshot }) {
  const winner = snapshot.leaderboard[0];
  return (
    <div className="grid gap-5 md:grid-cols-[1fr_260px]">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-[24px] bg-[#fff4d3] px-4 py-3 text-sm font-black text-[#705b00]">
          <Trophy size={18} />
          Final results persisted
        </div>
        <h3 className="playful-title text-5xl text-[#231942]">{winner?.username ?? "No winner yet"}</h3>
        <p className="mt-4 text-lg font-semibold text-[#667085]">
          {winner
            ? `Champion with ${winner.score} points. Download the PDF for rankings, analytics, and Valkey event proof.`
            : "Play a round to generate results."}
        </p>
      </div>
      <a
        href={`/api/export/pdf/${snapshot.room.code}`}
        className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-[32px] bg-[#231942] p-5 text-center text-white shadow-xl shadow-purple-950/20 transition hover:-translate-y-1"
      >
        <Download size={32} />
        <span className="text-lg font-black">Export PDF</span>
      </a>
    </div>
  );
}

function AnswerDistribution({ snapshot }: { snapshot: RoomSnapshot }) {
  const distribution = snapshot.answerDistribution;
  const data = distribution?.options ?? [];

  return (
    <section className="surface soft-shadow rounded-[32px] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[#7a67c7]">Mentimeter-style reveal</p>
          <h3 className="text-2xl font-black text-[#231942]">Answer distribution</h3>
        </div>
        <StatusPill icon={<BarChart3 size={15} />} label={`${distribution?.totalAnswers ?? 0} answers`} />
      </div>
      <div className="h-72">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 18, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee8ff" />
              <XAxis type="number" hide domain={[0, "dataMax + 1"]} />
              <YAxis type="category" dataKey="option" width={34} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(184,146,255,0.08)" }}
                formatter={(value, _name, item) => [
                  `${value} votes (${item.payload.percentage}%)`,
                  item.payload.label,
                ]}
              />
              <Bar dataKey="count" radius={[0, 18, 18, 0]} animationDuration={700}>
                {data.map((entry) => (
                  <Cell key={entry.option} fill={entry.isCorrect ? "#5edbc8" : "#b892ff"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[28px] bg-white/60 text-center text-sm font-bold text-[#667085]">
            Live bars appear as players submit answers.
          </div>
        )}
      </div>
    </section>
  );
}

function Leaderboard({ snapshot }: { snapshot: RoomSnapshot }) {
  const maxScore = Math.max(1, ...snapshot.leaderboard.map((entry) => entry.score));

  return (
    <section className="surface soft-shadow rounded-[32px] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[#7a67c7]">Sorted Set ranking</p>
          <h3 className="text-2xl font-black text-[#231942]">Live leaderboard</h3>
        </div>
        <Trophy className="text-[#f6bd24]" />
      </div>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {snapshot.leaderboard.map((entry) => (
            <motion.div
              layout
              key={entry.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="overflow-hidden rounded-[26px] bg-white/82 p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[16px] bg-[#fff4d3] text-sm font-black text-[#705b00]">
                    #{entry.rank}
                  </span>
                  <span className="font-black text-[#2b2448]">{entry.username}</span>
                </div>
                <span className="font-black text-[#5c45a8]">{entry.score}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#efe9ff]">
                <motion.div
                  layout
                  className="h-full rounded-full bg-[#b892ff]"
                  animate={{ width: `${Math.max(6, (entry.score / maxScore) * 100)}%` }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function RoomCard({
  snapshot,
  currentPlayer,
  isHost,
}: {
  snapshot: RoomSnapshot;
  currentPlayer: Player;
  isHost: boolean;
}) {
  return (
    <section className="surface soft-shadow rounded-[32px] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase text-[#7a67c7]">Room code</p>
          <p className="text-4xl font-black text-[#231942]">{snapshot.room.code}</p>
        </div>
        <div className="floaty flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#b8f2e6] text-xl font-black text-[#174a43]">
          {initials(currentPlayer.username)}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Players" value={snapshot.players.length} />
        <Metric label={isHost ? "Your role" : "Host"} value={isHost ? "Host" : "Player"} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[24px] bg-white/68 p-3">
      <p className="text-xs font-bold text-[#667085]">{label}</p>
      <p className="mt-1 text-xl font-black text-[#231942]">{value}</p>
    </div>
  );
}

function AgentPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="surface soft-shadow rounded-[32px] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="text-[#b892ff]" />
        <h3 className="text-xl font-black text-[#231942]">Agent layer</h3>
      </div>
      <div className="space-y-3">
        {snapshot.insights.map((insight) => (
          <div key={`${insight.agent}-${insight.message}`} className="rounded-[24px] bg-white/72 p-4">
            <p className="text-xs font-black uppercase text-[#7a67c7]">{insight.agent}</p>
            <p className="mt-1 text-sm font-bold leading-6 text-[#536078]">{insight.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ValkeyProof({ runtime, events }: { runtime: RuntimeStatus | null; events: RoomEvent[] }) {
  const seen = new Set(events.map((event) => event.primitive));
  const primitives = runtime?.primitives ?? ["Hash", "Set", "Sorted Set", "Stream", "Pub/Sub", "TTL", "Atomic Update"];

  return (
    <section className="surface soft-shadow rounded-[32px] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="text-[#ff9f9f]" />
        <h3 className="text-xl font-black text-[#231942]">Valkey activity</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {primitives.map((primitive) => (
          <div
            key={primitive}
            className={cn(
              "rounded-[20px] px-3 py-3 text-xs font-black",
              seen.has(primitive)
                ? "bg-[#e8fff9] text-[#176358]"
                : "bg-white/62 text-[#7b728f]",
            )}
          >
            {primitive}
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityFeed({ events }: { events: RoomEvent[] }) {
  return (
    <section className="surface soft-shadow rounded-[32px] p-5">
      <div className="mb-4 flex items-center gap-2">
        <PartyPopper className="text-[#f6bd24]" />
        <h3 className="text-xl font-black text-[#231942]">Live feed</h3>
      </div>
      <div className="max-h-96 space-y-3 overflow-auto pr-1">
        {events.length === 0 ? (
          <p className="rounded-[24px] bg-white/70 p-4 text-sm font-bold text-[#667085]">
            Events appear here from Valkey Streams.
          </p>
        ) : (
          events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-[24px] bg-white/76 p-4"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-black text-[#7a67c7]">{event.type}</p>
                <span className="rounded-[18px] bg-[#f4efff] px-2 py-1 text-[11px] font-black text-[#5c45a8]">
                  {event.primitive}
                </span>
              </div>
              <p className="text-sm font-bold leading-6 text-[#536078]">{event.message}</p>
            </motion.div>
          ))
        )}
      </div>
    </section>
  );
}
