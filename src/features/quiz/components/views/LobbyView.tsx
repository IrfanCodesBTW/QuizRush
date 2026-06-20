import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn, formatRoomCode, initials } from "@/lib/utils";

export interface LobbyViewProps {
  currentPlayer: any;
  createRoom: () => void;
  joinRoom: () => void;
  loading: string | null;
  roomInput: string;
  setRoomInput: (val: string) => void;
  history: { played: any[], hosted: any[] } | null | any[];
  activeRooms: any[];
  globalEvents: any[];
  manageRoom: (code: string) => void;
  startRoom: (code: string) => void;
  endRoom: (code: string) => void;
}

function getRoomTheme(code: string) {
  const charCodeSum = code.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const themes = [
    {
      title: "JavaScript Basics Trivia",
      icon: "code",
      bgClass: "bg-sticker-purple/10",
      iconColor: "text-sticker-purple",
      badge: "JS Basics",
      description: "How well do you know var, let, and const scope?"
    },
    {
      title: "Modern Art History 101",
      icon: "palette",
      bgClass: "bg-emoji-yellow/10",
      iconColor: "text-emoji-yellow",
      badge: "Art 101",
      description: "Paintbrush speedrun on post-impressionism."
    },
    {
      title: "Valkey Streams & PubSub",
      icon: "database",
      bgClass: "bg-[#e0f2fe]",
      iconColor: "text-electric-blue",
      badge: "Valkey",
      description: "Under the hood of real-time multi-agent scaling."
    },
    {
      title: "Global Hackathon Arena",
      icon: "rocket_launch",
      bgClass: "bg-rocket-orange/10",
      iconColor: "text-rocket-orange",
      badge: "Arena",
      description: "Live trivia battle of speed and correctness."
    }
  ];
  return themes[charCodeSum % themes.length];
}

function formatEventTime(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  return `${diffMin}m ago`;
}

const simulatedEvents = [
  {
    id: "sim-1",
    roomCode: "QR-ART",
    type: "player.joined",
    message: "PunkCat joined the room.",
    createdAt: new Date(Date.now() - 5000).toISOString(),
    payload: {}
  },
  {
    id: "sim-2",
    roomCode: "QR-JS",
    type: "achievement.unlocked",
    message: "NerdKing is on a 5x streak.",
    createdAt: new Date(Date.now() - 65000).toISOString(),
    payload: { achievement: "Streak Master" }
  },
  {
    id: "sim-3",
    roomCode: "QR-ART",
    type: "achievement.unlocked",
    message: "Doggo earned badge: Speedster.",
    createdAt: new Date(Date.now() - 120000).toISOString(),
    payload: { achievement: "Speedster" }
  },
  {
    id: "sim-4",
    roomCode: "QR-JS",
    type: "answer.submitted",
    message: "NoobCoder submitted answer.",
    createdAt: new Date(Date.now() - 300000).toISOString(),
    payload: { selectedOption: "A", responseTimeMs: 1200, correct: true }
  }
];

export function LobbyView(props: LobbyViewProps) {
  const { currentPlayer, createRoom, joinRoom, loading, roomInput, setRoomInput, history, activeRooms, globalEvents, manageRoom, startRoom, endRoom } = props;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"played" | "hosted">("played");
  const [selectedHistoryDetails, setSelectedHistoryDetails] = useState<any | null>(null);

  const isHost = currentPlayer?.isGuest === false;

  const getTheme = (code: string) => getRoomTheme(code);

  const playedHistory = history && !Array.isArray(history) && history.played ? history.played : (Array.isArray(history) ? history : []);
  const hostedHistory = history && !Array.isArray(history) && history.hosted ? history.hosted : [];

  const handleExportCsv = (h: any) => {
    if (!h || !h.leaderboard) return;
    const header = "Rank,Player,Score,Streak\n";
    const rows = h.leaderboard.map((p: any, i: number) => `${i + 1},${p.username},${p.score},${p.streak}`).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `room_${h.roomCode}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allEvents = [...globalEvents];
  if (allEvents.length === 0) {
    allEvents.push(...simulatedEvents);
  } else {
    allEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const renderFeedItem = (event: any) => {
    const timeStr = formatEventTime(event.createdAt);
    const theme = getRoomTheme(event.roomCode);
    const username = event.message.split(" ")[0] || "player";
    
    if (event.type === "player.joined") {
      return (
        <div key={event.id} className="flex gap-3 items-center bg-white border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] transition-transform">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-primary-container font-bold text-black text-sm">
            {initials(username)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body-md text-sm text-black leading-tight">
              <span className="font-bold text-electric-blue">@{username}</span> joined <span className="font-semibold text-black">{theme.title}</span>
            </p>
            <span className="text-[11px] text-secondary font-semibold">{timeStr}</span>
          </div>
        </div>
      );
    }

    if (event.type === "achievement.unlocked") {
      const achievement = event.payload.achievement || "Streak Master";
      const isStreak = achievement.toLowerCase().includes("streak");
      return (
        <div 
          key={event.id} 
          className={cn(
            "flex gap-3 items-center border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] transition-transform",
            isStreak ? "bg-[#faf0c9]" : "bg-[#f5fbf4]"
          )}
        >
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border-2 border-black font-bold text-black text-sm", isStreak ? "bg-emoji-yellow" : "bg-[#83f9bd]")}>
            {isStreak ? "🔥" : "🏆"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-label-bold text-xs text-black leading-tight uppercase font-black">
              {isStreak ? "Streak Alert!" : "Badge Unlocked"}
            </p>
            <p className="font-body-md text-sm text-black leading-tight mt-0.5">
              <span className="font-bold text-black">@{username}</span> {isStreak ? `is on a streak in ${theme.badge}!` : `earned badge: `}
              {!isStreak && (
                <span className="bg-black text-white px-2 py-0.5 rounded text-[11px] uppercase font-bold inline-block ml-1">
                  {achievement}
                </span>
              )}
            </p>
            <span className="text-[11px] text-secondary font-semibold">{timeStr}</span>
          </div>
        </div>
      );
    }

    if (event.type === "answer.submitted") {
      const isCorrect = event.payload.correct === true;
      return (
        <div key={event.id} className="flex gap-3 items-center bg-white border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] transition-transform">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border-2 border-black font-bold text-black text-sm", isCorrect ? "bg-[#83f9bd]" : "bg-error-container")}>
            {isCorrect ? "✅" : "❌"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body-md text-sm text-black leading-tight">
              <span className="font-bold">@{username}</span> answered {event.payload.selectedOption} in <span className="font-semibold text-black">{theme.badge}</span>
            </p>
            <span className="text-[11px] text-secondary font-semibold">{timeStr}</span>
          </div>
        </div>
      );
    }

    // Default room action / general event
    return (
      <div key={event.id} className="flex gap-3 items-center bg-white border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] transition-transform">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-surface-container font-bold text-black text-sm">
          📢
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body-md text-sm text-black leading-tight">
            {event.message}
          </p>
          <span className="text-[11px] text-secondary font-semibold">{timeStr}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-5xl mx-auto px-2"
      >
        {/* Header Title */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-heading-lg text-[48px] sm:text-[60px] md:text-[72px] text-black uppercase leading-none drop-shadow-[3px_3px_0px_#FFD938]">
              Host Dashboard
            </h1>
            <p className="font-body-lg text-body-lg text-secondary mt-1">
              Manage your live rooms, browse quiz templates, and monitor event feeds in real-time.
            </p>
          </div>
        </div>

        {/* Quick Start Panel */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[28px] text-sticker-purple animate-pulse">electric_bolt</span>
            <h2 className="font-heading-md text-[24px] uppercase text-black">Quick Start</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3 items-stretch w-full">
            {/* Create quiz card */}
            <div 
              onClick={() => setIsCreateModalOpen(true)}
              className="group cursor-pointer bg-sticker-purple border-4 border-black rounded-poster p-6 brutalist-shadow flex flex-col justify-between min-h-[220px] transition-all duration-150 ease-[var(--ease-out-brutal)] hover:translate-y-[-6px] hover:shadow-[10px_10px_0px_#000] active:scale-[0.97] active:translate-y-0 active:shadow-[2px_2px_0px_#000] relative overflow-hidden"
            >
              <div>
                <h3 className="font-heading-md text-[28px] uppercase text-black leading-tight">Create New Quiz</h3>
                <p className="font-body-md text-black/80 mt-2">Start from scratch or use AI</p>
              </div>
              <div className="flex justify-end mt-4">
                <span className="material-symbols-outlined text-[40px] text-black font-black border-4 border-black bg-white rounded-full p-2.5 group-hover:rotate-90 transition-transform duration-200 shadow-[2px_2px_0px_#000]">
                  add
                </span>
              </div>
            </div>

            {/* Join quiz card */}
            <div 
              className="bg-primary-container border-4 border-black rounded-poster p-6 brutalist-shadow flex flex-col justify-between min-h-[220px] transition-all duration-150 ease-[var(--ease-out-brutal)] hover:translate-y-[-6px] hover:shadow-[10px_10px_0px_#000]"
            >
              <div>
                <h3 className="font-heading-md text-[28px] uppercase text-black leading-tight">Join Active Quiz</h3>
                <p className="font-body-md text-black/80 mt-1">Enter room code to play</p>
                <input
                  type="text"
                  placeholder="QR-7421"
                  value={roomInput}
                  onChange={(e) => setRoomInput(formatRoomCode(e.target.value))}
                  className="mt-3 w-full bg-white border-4 border-black rounded-full px-4 py-2 font-body-md placeholder:text-secondary uppercase focus:outline-none text-[16px] text-black"
                />
              </div>
              <button
                onClick={joinRoom}
                disabled={loading === "join-room" || !roomInput}
                className="mt-3 w-full bg-white border-4 border-black rounded-full py-2.5 flex items-center justify-center gap-1.5 font-label-bold text-[15px] uppercase text-black brutalist-shadow-sm brutalist-shadow-hover transition-all active:scale-[0.97] active:translate-y-0 active:shadow-[1px_1px_0px_#000] disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined font-black text-[18px]">arrow_right_alt</span>
                <span>{loading === "join-room" ? "Joining..." : "Join room"}</span>
              </button>
            </div>

            {/* Browse templates card */}
            <div 
              onClick={() => alert("Browse Templates coming soon! Access over 500+ templates.")}
              className="group cursor-pointer bg-[#83f9bd] border-4 border-black rounded-poster p-6 brutalist-shadow flex flex-col justify-between min-h-[220px] transition-all duration-150 ease-[var(--ease-out-brutal)] hover:translate-y-[-6px] hover:shadow-[10px_10px_0px_#000] relative overflow-hidden"
            >
              <div>
                <h3 className="font-heading-md text-[28px] uppercase text-black leading-tight">Browse Templates</h3>
                <p className="font-body-md text-black/80 mt-2">Over 500+ brutalist templates</p>
              </div>
              <div className="flex justify-end mt-4">
                <span className="material-symbols-outlined text-[40px] text-black font-black border-4 border-black bg-white rounded-full p-2.5 group-hover:scale-110 transition-transform duration-200 shadow-[2px_2px_0px_#000]">
                  palette
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[1.45fr_0.55fr] items-stretch w-full mb-12">
          
          {/* Left Column: Live Rooms */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[28px] text-rocket-orange animate-pulse">sensors</span>
              <h2 className="font-heading-md text-[24px] uppercase text-black">Live Rooms</h2>
            </div>

            <div className="space-y-4">
              {activeRooms.length === 0 ? (
                <div className="bg-white border-4 border-dashed border-black/20 rounded-poster p-8 text-center text-secondary/60">
                  <span className="material-symbols-outlined text-[48px] mb-2 text-secondary/40">hourglass_empty</span>
                  <p className="font-heading-md text-[20px] uppercase text-black">No active rooms found</p>
                  <p className="font-body-md text-sm mt-1">Create a new quiz above to launch the first live room!</p>
                </div>
              ) : (
                activeRooms.map((room) => {
                  const theme = getRoomTheme(room.code);
                  const isLobby = room.status === "lobby";
                  const isLive = room.status === "live" || room.status === "reveal";
                  const isMyHostedRoom = room.hostId === currentPlayer.id;

                  return (
                    <div 
                      key={room.code} 
                      className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-150 ease-[var(--ease-out-brutal)] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_#000]"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Left icon frame */}
                        <div className={cn("hidden sm:flex h-20 w-24 border-2 border-black rounded-xl items-center justify-center shadow-[3px_3px_0px_#000] overflow-hidden", theme.bgClass)}>
                          <span className={cn("material-symbols-outlined text-[40px] fill-icon", theme.iconColor)}>
                            {theme.icon}
                          </span>
                        </div>

                        {/* Text Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <h4 className="font-heading-md text-[22px] uppercase text-black leading-tight truncate">
                              {theme.title}
                            </h4>
                            <span className={cn(
                              "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0px_#000] leading-none",
                              isLive ? "bg-rocket-orange text-white" : "bg-[#83f9bd] text-black"
                            )}>
                              {isLive ? "LIVE NOW" : "STARTING SOON"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs mb-3 font-semibold">
                            <span className="bg-[#ffeb99] border-2 border-black px-2 py-0.5 rounded text-black uppercase">
                              PIN: {room.code}
                            </span>
                            <span className="bg-surface-container border-2 border-black px-2 py-0.5 rounded text-black uppercase">
                              PLAYERS: {room.playersCount}
                            </span>
                          </div>

                          {/* Progress bar or WAITING ROOM text */}
                          <div className="w-full">
                            {isLive ? (
                              <div>
                                <div className="flex justify-between items-center text-[11px] font-semibold text-secondary uppercase mb-1">
                                  <span>Question {room.currentQuestionIndex + 1} of {room.totalQuestions}</span>
                                </div>
                                <div className="w-full h-3 bg-surface-container border-2 border-black rounded-full overflow-hidden shadow-[1px_1px_0px_#000]">
                                  <div 
                                    className="h-full bg-electric-blue transition-all duration-300"
                                    style={{ width: `${((room.currentQuestionIndex + 1) / room.totalQuestions) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] font-bold text-secondary uppercase bg-surface-container border border-black/10 px-3 py-1 rounded-lg inline-block">
                                Waiting room | {room.playersCount} joined
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                        {isMyHostedRoom ? (
                          <>
                            {isLobby && (
                              <button
                                onClick={() => startRoom(room.code)}
                                className="bg-[#83f9bd] border-4 border-black rounded-full px-5 py-2.5 font-label-bold text-sm uppercase text-black brutalist-shadow-sm brutalist-shadow-hover transition-all active:scale-[0.97] active:translate-y-0 active:shadow-[1px_1px_0px_#000] cursor-pointer"
                              >
                                START NOW
                              </button>
                            )}
                            {isLive && (
                              <>
                                <button
                                  onClick={() => manageRoom(room.code)}
                                  className="bg-black text-white border-4 border-black rounded-full px-5 py-2.5 font-label-bold text-sm uppercase brutalist-shadow-sm brutalist-shadow-hover transition-all active:scale-[0.97] active:translate-y-0 active:shadow-[1px_1px_0px_#000] cursor-pointer"
                                >
                                  MANAGE
                                </button>
                                <button
                                  onClick={() => endRoom(room.code)}
                                  className="bg-white text-black border-4 border-black rounded-full px-5 py-2.5 font-label-bold text-sm uppercase brutalist-shadow-sm brutalist-shadow-hover transition-all active:scale-[0.97] active:translate-y-0 active:shadow-[1px_1px_0px_#000] cursor-pointer"
                                >
                                  END
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={async () => {
                              setRoomInput(room.code);
                              joinRoom();
                            }}
                            className="bg-primary-container border-4 border-black rounded-full px-5 py-2.5 font-label-bold text-sm uppercase text-black brutalist-shadow-sm brutalist-shadow-hover transition-all active:scale-[0.97] active:translate-y-0 active:shadow-[1px_1px_0px_#000] cursor-pointer"
                          >
                            {isLive ? "SPECTATE" : "JOIN NOW"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Activity Feed */}
          <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow flex flex-col h-full min-h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[32px] text-electric-blue">rss_feed</span>
              <div>
                <h3 className="font-heading-md text-[24px] uppercase text-black leading-none">Activity Feed</h3>
                <p className="text-[11px] text-secondary font-semibold uppercase mt-1">Live updates from rooms</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-3 scrollbar-thin">
              {allEvents.map((event) => renderFeedItem(event))}
            </div>
          </div>

        </div>

        {/* Quiz History Dashboard Card */}
        {currentPlayer && !currentPlayer.isGuest && (
          <div className="bg-white border-4 border-black rounded-poster p-8 brutalist-shadow w-full mb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-rocket-orange">history</span>
                <h3 className="font-heading-md text-[28px] uppercase text-black">Your Quiz History</h3>
              </div>
              <div className="flex bg-surface-container rounded-full p-1 border-2 border-black">
                <button
                  onClick={() => setActiveHistoryTab("played")}
                  className={cn(
                    "px-4 py-2 rounded-full font-label-bold text-label-bold uppercase text-[12px] md:text-[14px] transition-all",
                    activeHistoryTab === "played" ? "bg-emoji-yellow text-black border-2 border-black shadow-[2px_2px_0px_#000]" : "text-on-surface-variant hover:text-black"
                  )}
                >
                  Played Games
                </button>
                <button
                  onClick={() => setActiveHistoryTab("hosted")}
                  className={cn(
                    "px-4 py-2 rounded-full font-label-bold text-label-bold uppercase text-[12px] md:text-[14px] transition-all",
                    activeHistoryTab === "hosted" ? "bg-emoji-yellow text-black border-2 border-black shadow-[2px_2px_0px_#000]" : "text-on-surface-variant hover:text-black"
                  )}
                >
                  Hosted Rooms
                </button>
              </div>
            </div>

            {activeHistoryTab === "played" && (
              playedHistory.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-[360px] overflow-y-auto pr-2">
                  {playedHistory.map((h: any) => (
                    <div key={h.id} className="bg-surface-container border-2 border-black p-4 rounded-xl flex flex-col justify-between shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] transition-transform">
                      <div className="flex justify-between items-start border-b border-black/10 pb-2 mb-2">
                        <span className="font-label-bold text-label-bold text-black uppercase">Room: {h.roomCode}</span>
                        <span className="font-small text-[11px] text-secondary uppercase bg-white border border-black px-2 py-0.5 rounded-full">
                          {new Date(h.playedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </span>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <div>
                          <p className="font-small text-[10px] text-secondary uppercase">Accuracy</p>
                          <p className="font-heading-md text-[18px] text-black leading-none">{h.correctAnswers} / {h.totalQuestions}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-small text-[10px] text-secondary uppercase">Score</p>
                          <p className="font-heading-md text-[24px] text-rocket-orange leading-none">{h.score} pts</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant text-center py-8 bg-surface-container border-2 border-dashed border-black/10 rounded-xl">
                  No games played yet. Join a room to start your history!
                </p>
              )
            )}

            {activeHistoryTab === "hosted" && (
              hostedHistory.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-[360px] overflow-y-auto pr-2">
                  {hostedHistory.map((h: any) => (
                    <div key={h.roomCode + h.playedAt} className="bg-surface-container border-2 border-black p-4 rounded-xl flex flex-col justify-between shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] transition-transform">
                      <div className="flex justify-between items-start border-b border-black/10 pb-2 mb-2">
                        <span className="font-label-bold text-label-bold text-black uppercase">Room: {h.roomCode}</span>
                        <span className="font-small text-[11px] text-secondary uppercase bg-white border border-black px-2 py-0.5 rounded-full">
                          {new Date(h.playedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </span>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <div>
                          <p className="font-small text-[10px] text-secondary uppercase">Players</p>
                          <p className="font-heading-md text-[18px] text-black leading-none">{h.leaderboard?.length || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-small text-[10px] text-secondary uppercase">Questions</p>
                          <p className="font-heading-md text-[24px] text-rocket-orange leading-none">{h.questions?.length || 0}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button 
                          onClick={() => setSelectedHistoryDetails(h)}
                          className="flex-1 bg-white border-2 border-black rounded-md py-1 font-label-bold text-[10px] uppercase shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all text-center flex items-center justify-center gap-1 hover:bg-surface-container"
                        >
                          <span className="material-symbols-outlined text-[14px]">leaderboard</span>
                          Details
                        </button>
                        <button 
                          onClick={() => createRoom()}
                          className="flex-1 bg-electric-blue text-white border-2 border-black rounded-md py-1 font-label-bold text-[10px] uppercase shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all text-center flex items-center justify-center gap-1 hover:brightness-110"
                        >
                          <span className="material-symbols-outlined text-[14px]">replay</span>
                          Replay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant text-center py-8 bg-surface-container border-2 border-dashed border-black/10 rounded-xl">
                  You haven't hosted any rooms yet. Create a quiz to get started!
                </p>
              )
            )}
          </div>
        )}
      </motion.div>

      {/* History Details Modal */}
      <AnimatePresence>
        {selectedHistoryDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white border-4 border-black rounded-poster p-6 md:p-8 brutalist-shadow max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-heading-lg text-[28px] uppercase text-black leading-none">Room {selectedHistoryDetails.roomCode} Results</h3>
                  <p className="font-small text-secondary mt-2">Played on {new Date(selectedHistoryDetails.playedAt).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setSelectedHistoryDetails(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-surface-container hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[2px_2px_0px_#000]"
                >
                  <span className="material-symbols-outlined text-black font-black">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black text-left">
                      <th className="py-2 font-label-bold uppercase text-[12px] text-secondary">Rank</th>
                      <th className="py-2 font-label-bold uppercase text-[12px] text-secondary">Player</th>
                      <th className="py-2 font-label-bold uppercase text-[12px] text-secondary text-right">Score</th>
                      <th className="py-2 font-label-bold uppercase text-[12px] text-secondary text-right">Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistoryDetails.leaderboard?.map((p: any, i: number) => (
                      <tr key={p.id} className="border-b border-black/10">
                        <td className="py-3 font-heading-md text-[18px]">{i + 1}</td>
                        <td className="py-3 font-label-bold flex items-center gap-2">
                          <span className="w-6 h-6 flex items-center justify-center bg-sticker-purple text-white rounded-full text-[10px]">{p.avatar}</span>
                          {p.username}
                        </td>
                        <td className="py-3 font-heading-md text-[18px] text-rocket-orange text-right">{p.score}</td>
                        <td className="py-3 font-heading-md text-[18px] text-right">{p.streak}</td>
                      </tr>
                    ))}
                    {(!selectedHistoryDetails.leaderboard || selectedHistoryDetails.leaderboard.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-on-surface-variant font-label-bold uppercase">No players joined this game.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                <button
                  onClick={() => handleExportCsv(selectedHistoryDetails)}
                  className="flex-1 bg-white border-4 border-black text-black px-6 py-4 font-heading-md text-[20px] uppercase shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:shadow-none transition-all text-center flex items-center justify-center gap-2 hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined">download</span>
                  Export CSV
                </button>
                <button
                  onClick={() => {
                    setSelectedHistoryDetails(null);
                    createRoom();
                  }}
                  className="flex-1 bg-electric-blue border-4 border-black text-white px-6 py-4 font-heading-md text-[20px] uppercase shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:shadow-none transition-all text-center flex items-center justify-center gap-2 hover:brightness-110"
                >
                  <span className="material-symbols-outlined">replay</span>
                  Replay Quiz
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Quiz Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border-4 border-black rounded-poster p-6 brutalist-shadow"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-heading-lg text-[32px] uppercase text-black leading-none">Select Quiz Mode</h3>
                  <p className="font-body-md text-secondary mt-2">Choose how you want to generate your quiz.</p>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 hover:bg-surface-container rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined font-black text-black text-[28px]">close</span>
                </button>
              </div>

              <div className="grid gap-4">
                {/* Normal Test Quiz */}
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    createRoom();
                  }}
                  className="flex items-center gap-4 p-4 border-4 border-black rounded-xl bg-emoji-yellow/20 hover:bg-emoji-yellow transition-colors brutalist-shadow-sm brutalist-shadow-hover active:translate-y-0 active:shadow-[1px_1px_0px_#000] text-left group"
                >
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-white border-2 border-black rounded-full group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[24px] text-black">quiz</span>
                  </div>
                  <div>
                    <h4 className="font-heading-md text-[20px] uppercase text-black">Normal Test Quiz</h4>
                    <p className="font-body-md text-sm text-black/80">Standard manually created quiz. Default dummy test endpoint.</p>
                  </div>
                </button>

                {/* AI-Generated Quiz */}
                <button
                  onClick={() => {
                    alert("Future Gemini Integration: AI-Driven Quiz Generation coming soon!");
                    setIsCreateModalOpen(false);
                  }}
                  className="flex items-center gap-4 p-4 border-4 border-black rounded-xl bg-electric-blue/10 hover:bg-electric-blue/20 transition-colors brutalist-shadow-sm brutalist-shadow-hover active:translate-y-0 active:shadow-[1px_1px_0px_#000] text-left group relative overflow-hidden"
                >
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-white border-2 border-black rounded-full group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[24px] text-electric-blue animate-pulse">smart_toy</span>
                  </div>
                  <div>
                    <h4 className="font-heading-md text-[20px] uppercase text-black flex items-center gap-2">
                      AI-Generated Quiz
                      <span className="bg-rocket-orange text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Coming Soon</span>
                    </h4>
                    <p className="font-body-md text-sm text-black/80">Automatically generate quizzes based on any topic via Gemini AI.</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
