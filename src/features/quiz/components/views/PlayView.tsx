import { motion } from "framer-motion";
import { cn, initials } from "@/lib/utils";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from "recharts";

export interface PlayViewProps {
  [key: string]: any;
}

export function PlayView(props: PlayViewProps) {
  const {
    username,
    loading,
    error,
    createRoom,
    setRoomInput,
    snapshot,
    isHost,
    startGame,
    revealQuestion,
    advanceGame,
    answer,
    selected,
    setSnapshot,
    setActiveTab,
    currentQuestion,
    remainingMs,
    currentQuestionProgress,
    hasAnswered
  } = props;

  const answerOptions = ["A", "B", "C", "D"];

  return (
    <>
<motion.div
                  key="play"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex flex-col gap-6"
                >
                  {/* Play Header */}
                  <header className="mb-6 flex flex-col items-center text-center pb-4">
                    <h2 className="font-hero-xl text-hero-xl-mobile md:text-hero-xl text-black uppercase drop-shadow-[4px_4px_0px_#C9A8FF] leading-none text-center">
                      {snapshot.room.status === "lobby"
                        ? "Lobby Setup"
                        : snapshot.room.status === "ended"
                          ? "Quiz Finished"
                          : `Question ${snapshot.room.currentQuestionIndex + 1}`}
                    </h2>
                  </header>

                  {/* Lobby Setup Stage */}
                  {snapshot.room.status === "lobby" && (
                    <div className="bg-white border-4 border-black rounded-poster p-8 brutalist-shadow w-full max-w-5xl mx-auto flex flex-col gap-8">
                      {/* Prominent Share Room Code Section */}
                      <div className="text-center bg-emoji-yellow border-4 border-black rounded-poster p-8 brutalist-shadow-sm flex flex-col items-center justify-center">
                        <p className="font-label-bold text-label-bold text-black uppercase tracking-wider text-[16px]">Share this Room Code with players</p>
                        <h1 
                          className="font-hero-xl text-[64px] sm:text-[80px] md:text-[100px] text-black tracking-widest my-4 select-all cursor-pointer hover:scale-105 transition-transform duration-150 active:scale-95" 
                          onClick={() => {
                            navigator.clipboard.writeText(snapshot.room.code);
                            alert(`Copied room code ${snapshot.room.code} to clipboard!`);
                          }} 
                          title="Click to copy"
                        >
                          {snapshot.room.code}
                        </h1>
                        <p className="font-body-md text-body-md text-black/70">Click code to copy</p>
                      </div>

                      {/* Main Lobby Columns */}
                      <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-6">
                        {/* Players List Card */}
                        <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow-sm flex flex-col min-h-[320px]">
                          <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                            <span className="material-symbols-outlined text-[28px] text-black">group</span>
                            <h3 className="font-heading-md text-[24px] uppercase text-black">Joined Players</h3>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {snapshot.players.map((p: any) => (
                              <div
                                key={p.id}
                                className="flex items-center gap-2 bg-white border-2 border-black px-4 py-2 rounded-full shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] active:translate-y-0 active:shadow-[0px_0px_0px_#000] transition-transform group"
                              >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold border-2 border-black text-black">
                                  {initials(p.username)}
                                </span>
                                <span className="font-label-bold text-label-bold text-black uppercase">{p.username}</span>
                                {isHost && p.id !== snapshot.room.hostId && (
                                  <button
                                    onClick={() => props.kickPlayer?.(p.id)}
                                    className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-error text-white hover:bg-error-container hover:text-on-error-container transition-colors focus:outline-none"
                                    title="Kick Player"
                                  >
                                    <span className="material-symbols-outlined text-[16px] font-bold">close</span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Host Controls / Action Panel */}
                        <div className="bg-sticker-purple border-4 border-black rounded-poster p-6 brutalist-shadow-sm flex flex-col justify-between min-h-[320px]">
                          <div className="text-center flex flex-col items-center justify-center flex-grow">
                            <p className="font-hero-xl text-[80px] md:text-[120px] text-black leading-none">{snapshot.players.length}</p>
                            <p className="font-heading-md text-[20px] md:text-[24px] text-black uppercase mt-2">players ready</p>
                          </div>

                          <div className="mt-6 flex flex-col gap-3">
                            {/* Start Quiz option */}
                            {isHost ? (
                              <button
                                onClick={startGame}
                                disabled={loading === "start-game"}
                                className="w-full bg-white border-4 border-black rounded-full py-3 flex items-center justify-center gap-2 font-label-bold text-label-bold text-black brutalist-shadow-sm brutalist-shadow-hover transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] active:scale-[0.97] active:translate-y-0 active:shadow-[2px_2px_0px_#000] cursor-pointer"
                              >
                                <span className="material-symbols-outlined font-black">play_arrow</span>
                                <span>Start Quiz</span>
                              </button>
                            ) : (
                              <p className="text-center font-label-bold text-label-bold text-black uppercase animate-pulse">Waiting for host...</p>
                            )}

                            {/* Share Room Code Option */}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(snapshot.room.code);
                                alert(`Copied room code ${snapshot.room.code} to clipboard!`);
                              }}
                              className="w-full bg-white border-4 border-black rounded-full py-3 flex items-center justify-center gap-2 font-label-bold text-label-bold text-black brutalist-shadow-sm brutalist-shadow-hover transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] active:scale-[0.97] active:translate-y-0 active:shadow-[2px_2px_0px_#000] cursor-pointer"
                            >
                              <span className="material-symbols-outlined font-black">share</span>
                              <span>Share Room Code</span>
                            </button>

                            {/* Players Ready display trigger/indicator */}
                            <button
                              onClick={() => alert(`Joined: ${snapshot.players.map((p: any) => p.username).join(", ")}`)}
                              className="w-full bg-white border-4 border-black rounded-full py-3 flex items-center justify-center gap-2 font-label-bold text-label-bold text-black brutalist-shadow-sm brutalist-shadow-hover transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] active:scale-[0.97] active:translate-y-0 active:shadow-[2px_2px_0px_#000] cursor-pointer"
                            >
                              <span className="material-symbols-outlined font-black">done_all</span>
                              <span>Players Ready ({snapshot.players.length})</span>
                            </button>

                            {/* Exit / Return to Main View */}
                            <button
                              onClick={() => {
                                setSnapshot(null);
                                setRoomInput("");
                              }}
                              className="w-full bg-white border-4 border-black rounded-full py-3 flex items-center justify-center gap-2 font-label-bold text-label-bold text-black brutalist-shadow-sm brutalist-shadow-hover transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] active:scale-[0.97] active:translate-y-0 active:shadow-[2px_2px_0px_#000] cursor-pointer"
                            >
                              <span className="material-symbols-outlined font-black">home</span>
                              <span>Exit Lobby</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quiz Core Gameplay State */}
                  {currentQuestion && snapshot.room.status !== "lobby" && snapshot.room.status !== "ended" && (
                    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
                      {snapshot.room.isPaused && (
                        <div className="bg-rocket-orange text-white border-4 border-black rounded-poster p-4 font-heading-md text-xl uppercase brutalist-shadow text-center flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[24px]">pause_circle</span>
                          Quiz Paused by Host
                        </div>
                      )}
                      <div className="bg-white border-4 border-black rounded-poster p-6 brutalist-shadow flex flex-col gap-6">
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
                      <div className="h-8 w-full bg-surface-container border-4 border-black rounded-full overflow-hidden relative">
                        <div
                          className={cn(
                            "absolute inset-0 border-r-4 border-black transition-colors duration-300 origin-left",
                            remainingMs < 5000 ? "bg-error-red animate-pulse" : "bg-electric-blue"
                          )}
                          style={{ transform: `scaleX(${currentQuestionProgress / 100})` }}
                        ></div>
                      </div>

                      <div className={cn("transition-opacity", snapshot.room.isPaused && "opacity-50")}>
                        <h3 className="font-heading-md text-heading-md text-black uppercase leading-tight mt-2">
                        {currentQuestion.prompt}
                      </h3>

                      <motion.div 
                        className="grid gap-4 sm:grid-cols-2 mt-2"
                        variants={{
                          hidden: {},
                          visible: { transition: { staggerChildren: 0.05 } }
                        }}
                        initial="hidden"
                        animate="visible"
                      >
                        {answerOptions.map((option) => {
                          const chosen = selected === option;
                          const isCorrect = snapshot.room.status === "reveal" && snapshot.answerDistribution?.options.find((o: any) => o.option === option)?.isCorrect;

                          let cardBg = "bg-white";
                          if (chosen) {
                            cardBg = "bg-sticker-purple";
                          }
                          if (isCorrect) {
                            cardBg = "bg-primary-container";
                          }

                          return (
                            <motion.button
                              key={option}
                              variants={{
                                hidden: { opacity: 0, scale: 0.95 },
                                visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 150, damping: 15 } }
                              }}
                              disabled={snapshot.room.status !== "live" || hasAnswered || loading === "answer" || snapshot.room.isPaused}
                              onClick={() => answer(option)}
                              className={cn(
                                "min-h-[120px] rounded-poster p-4 border-4 border-black text-left brutalist-shadow-sm brutalist-shadow-hover transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] flex flex-col justify-between group disabled:pointer-events-none cursor-pointer focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2 active:scale-[0.97] active:translate-y-0 active:shadow-[2px_2px_0px_#000]",
                                cardBg
                              )}
                            >
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white border-2 border-white shadow-[2px_2px_0px_#000]">
                                {option}
                              </span>
                              <span className="block font-heading-md text-[20px] md:text-[24px] text-black uppercase mt-2 group-hover:text-rocket-orange transition-colors">
                                {currentQuestion.options[option]}
                              </span>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                      </div>

                      {/* Control Panel */}
                      <div className="mt-4 flex flex-col gap-4 border-t-4 border-black pt-4">
                        <div className="flex flex-wrap gap-4">
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
                              className="bg-emoji-yellow border-4 border-black rounded-full px-6 py-2 font-label-bold text-label-bold text-black uppercase brutalist-shadow-sm brutalist-shadow-hover transition-[transform,box-shadow,background-color] active:scale-[0.97] active:shadow-[1px_1px_0px_#000] cursor-pointer"
                            >
                              Force Reveal
                            </button>
                          )}
                          {isHost && snapshot.room.status === "reveal" && (
                            <button
                              onClick={advanceGame}
                              disabled={loading === "advance"}
                              className="bg-sticker-purple border-4 border-black rounded-full px-6 py-2 font-label-bold text-label-bold text-black uppercase brutalist-shadow-sm brutalist-shadow-hover transition-[transform,box-shadow,background-color] active:scale-[0.97] active:shadow-[1px_1px_0px_#000] cursor-pointer"
                            >
                              Next Question
                            </button>
                          )}
                        </div>

                        {/* Removed Admin Privileges block (moved to floating bar) */}
                      </div>
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
                              {snapshot.answerDistribution.options.map((entry: any) => (
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
                          <span className="material-symbols-outlined fill-icon text-[18px]">emoji_events</span>
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
                      <div className="flex flex-col gap-3">
                        <a
                          href={`/api/export/pdf/${snapshot.room.code}`}
                          className="flex min-h-[100px] w-full md:w-[260px] flex-col items-center justify-center gap-1 bg-rocket-orange border-4 border-black text-white rounded-xl brutalist-shadow brutalist-shadow-hover transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] active:scale-[0.97] active:translate-y-0 active:shadow-[2px_2px_0px_#000] focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2"
                        >
                          <span className="material-symbols-outlined text-[32px]">download</span>
                          <span className="font-heading-md text-[18px] uppercase text-center">Export PDF</span>
                        </a>
                        {isHost ? (
                          <button
                            onClick={createRoom}
                            disabled={loading === "create-room"}
                            className="flex min-h-[100px] w-full md:w-[260px] flex-col items-center justify-center gap-1 bg-electric-blue border-4 border-black text-white rounded-xl brutalist-shadow brutalist-shadow-hover transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] active:scale-[0.97] active:translate-y-0 active:shadow-[2px_2px_0px_#000] focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2 cursor-pointer disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[32px]">replay</span>
                            <span className="font-heading-md text-[18px] uppercase text-center">Play Again</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSnapshot(null);
                              setRoomInput("");
                              setActiveTab("play");
                            }}
                            className="flex min-h-[100px] w-full md:w-[260px] flex-col items-center justify-center gap-1 bg-sticker-purple border-4 border-black text-black rounded-xl brutalist-shadow brutalist-shadow-hover transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] active:scale-[0.97] active:translate-y-0 active:shadow-[2px_2px_0px_#000] focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[32px]">home</span>
                            <span className="font-heading-md text-[18px] uppercase text-center">Return to Lobby</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Floating Host Action Bar */}
                {isHost && snapshot.room.status !== "ended" && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border-4 border-black p-3 rounded-full shadow-[4px_4px_0px_#000]">
                    <div className="flex items-center gap-2 pr-4 border-r-2 border-black">
                      <span className="material-symbols-outlined text-black font-black">admin_panel_settings</span>
                      <span className="font-label-bold text-label-bold uppercase hidden sm:inline text-black">Host Controls</span>
                    </div>
                    
                    <button
                      onClick={() => snapshot.room.isLocked ? props.unlockRoom?.() : props.lockRoom?.()}
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full border-2 border-black transition-transform active:scale-95 shadow-[2px_2px_0px_#000]",
                        snapshot.room.isLocked ? "bg-error-red text-white" : "bg-electric-blue text-white"
                      )}
                      title={snapshot.room.isLocked ? "Unlock Room" : "Lock Room"}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {snapshot.room.isLocked ? "lock" : "lock_open"}
                      </span>
                    </button>

                    <button
                      onClick={() => snapshot.room.isPaused ? props.resumeGame?.() : props.pauseGame?.()}
                      disabled={snapshot.room.status === "lobby"}
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full border-2 border-black transition-transform active:scale-95 shadow-[2px_2px_0px_#000] disabled:opacity-50",
                        snapshot.room.isPaused ? "bg-rocket-orange text-white" : "bg-emoji-yellow text-black"
                      )}
                      title={snapshot.room.isPaused ? "Resume Quiz" : "Pause Quiz"}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {snapshot.room.isPaused ? "play_arrow" : "pause"}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        if(confirm("Are you sure you want to end the quiz early?")) {
                          props.endGame?.();
                        }
                      }}
                      disabled={snapshot.room.status === "lobby"}
                      className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-black bg-error-red text-white transition-transform active:scale-95 shadow-[2px_2px_0px_#000] disabled:opacity-50 cursor-pointer"
                      title="End Quiz"
                    >
                      <span className="material-symbols-outlined text-[18px]">stop</span>
                    </button>
                  </div>
                )}
    </>
  );
}
