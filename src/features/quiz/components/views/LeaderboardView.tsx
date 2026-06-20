import { motion } from "framer-motion";
import { cn, initials } from "@/lib/utils";

export interface LeaderboardViewProps {
  [key: string]: any;
}

export function LeaderboardView(props: LeaderboardViewProps) {
  const {
    username,
    error,
    currentPlayer,
    snapshot
  } = props;

  return (
    <>
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
                          <motion.div 
                            custom="70%"
                            variants={{
                              hidden: { height: "0%", opacity: 0 },
                              visible: (h: string) => ({ height: h, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 14 } })
                            }}
                            initial="hidden"
                            animate="visible"
                            className="flex flex-col items-center justify-end w-[30%] max-w-[200px] relative"
                          >
                            <div className="absolute -top-[100px] z-20 sticker-float flex flex-col items-center">
                              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-black bg-primary-container shadow-[3px_3px_0px_#000] overflow-hidden flex items-center justify-center relative font-heading-md text-black text-[22px]">
                                {initials(snapshot.leaderboard[1].username)}
                              </div>
                              <div className="bg-white border-2 border-black rounded-full px-3 py-1 mt-[-10px] z-30 shadow-[2px_2px_0px_#000] text-center">
                                <p className="font-label-bold text-label-bold text-black text-[10px] md:text-[14px]">
                                  {snapshot.leaderboard[1].username}
                                </p>
                                <p className="font-small text-small text-error-red leading-none mt-0.5">{snapshot.leaderboard[1].score} pts</p>
                              </div>
                            </div>
                            <div className="w-full h-[60%] bg-primary-container hard-border brutalist-shadow flex flex-col items-center pt-4 relative overflow-hidden group hover:translate-y-[-5px] transition-transform">
                              <span className="font-heading-lg text-[42px] md:text-heading-lg text-black">2</span>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="h-[40%] w-[30%] max-w-[200px] border-4 border-dashed border-black/10 rounded-t-lg bg-black/[0.02]"></div>
                        )}

                        {/* 1st Place Podium */}
                        {snapshot.leaderboard[0] ? (
                          <motion.div 
                            custom="100%"
                            variants={{
                              hidden: { height: "0%", opacity: 0 },
                              visible: (h: string) => ({ height: h, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 14 } })
                            }}
                            initial="hidden"
                            animate="visible"
                            className="flex flex-col items-center justify-end w-[35%] max-w-[240px] relative z-10"
                          >
                            <div className="absolute -top-[130px] z-20 sticker-float flex flex-col items-center" style={{ animationDelay: "0.5s" }}>
                              <span className="material-symbols-outlined text-emoji-yellow text-[44px] md:text-[56px] fill-icon absolute -top-10 drop-shadow-[2px_2px_0px_#000]">crown</span>
                              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-black bg-emoji-yellow shadow-[4px_4px_0px_#000] overflow-hidden flex items-center justify-center relative font-heading-md text-black text-[28px]">
                                {initials(snapshot.leaderboard[0].username)}
                              </div>
                              <div className="bg-white border-4 border-black rounded-full px-4 py-1.5 mt-[-12px] z-30 shadow-[4px_4px_0px_#000] text-center rotate-[-2deg]">
                                <p className="font-heading-md text-heading-md text-black text-[15px] md:text-[20px] leading-tight">
                                  {snapshot.leaderboard[0].username}
                                </p>
                                <p className="font-label-bold text-label-bold text-rocket-orange leading-none mt-0.5">{snapshot.leaderboard[0].score} pts</p>
                              </div>
                            </div>
                            <div className="w-full h-[75%] bg-emoji-yellow hard-border brutalist-shadow flex flex-col items-center pt-6 relative overflow-hidden group hover:translate-y-[-5px] transition-transform">
                              <span className="font-hero-xl text-[56px] md:text-hero-xl text-black">1</span>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="h-[60%] w-[35%] max-w-[240px] border-4 border-dashed border-black/10 rounded-t-lg bg-black/[0.02]"></div>
                        )}

                        {/* 3rd Place Podium */}
                        {snapshot.leaderboard[2] ? (
                          <motion.div 
                            custom="60%"
                            variants={{
                              hidden: { height: "0%", opacity: 0 },
                              visible: (h: string) => ({ height: h, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 14 } })
                            }}
                            initial="hidden"
                            animate="visible"
                            className="flex flex-col items-center justify-end w-[30%] max-w-[200px] relative"
                          >
                            <div className="absolute -top-[100px] z-20 sticker-float flex flex-col items-center" style={{ animationDelay: "1s" }}>
                              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-black bg-sticker-purple shadow-[3px_3px_0px_#000] overflow-hidden flex items-center justify-center relative font-heading-md text-black text-[22px]">
                                {initials(snapshot.leaderboard[2].username)}
                              </div>
                              <div className="bg-white border-2 border-black rounded-full px-3 py-1 mt-[-10px] z-30 shadow-[2px_2px_0px_#000] text-center">
                                <p className="font-label-bold text-label-bold text-black text-[10px] md:text-[14px]">
                                  {snapshot.leaderboard[2].username}
                                </p>
                                <p className="font-small text-small text-electric-blue leading-none mt-0.5">{snapshot.leaderboard[2].score} pts</p>
                              </div>
                            </div>
                            <div className="w-full h-[50%] bg-sticker-purple hard-border brutalist-shadow flex flex-col items-center pt-4 relative overflow-hidden group hover:translate-y-[-5px] transition-transform">
                              <span className="font-heading-lg text-[42px] md:text-heading-lg text-black">3</span>
                            </div>
                          </motion.div>
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
                      <motion.div 
                        className="w-full max-w-2xl space-y-4 mt-8 mb-12"
                        variants={{
                          hidden: {},
                          visible: { transition: { staggerChildren: 0.05 } }
                        }}
                        initial="hidden"
                        animate="visible"
                      >
                        <h2 className="font-heading-md text-heading-md text-black uppercase mb-4 inline-block bg-white px-4 py-2 border-4 border-black shadow-[3px_3px_0px_#000] rotate-1">
                          The Rest of the Pack
                        </h2>
                        {snapshot.leaderboard.slice(3).map((entry: any) => {
                          const isSelf = entry.id === currentPlayer?.id;
                          return (
                            <motion.div
                              key={entry.id}
                              variants={{
                                hidden: { y: 15, opacity: 0 },
                                visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
                              }}
                              className={cn(
                                "hard-border rounded-xl p-4 flex items-center justify-between brutalist-shadow transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#000] active:scale-[0.97] active:translate-y-0 active:shadow-[2px_2px_0px_#000] focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2 group cursor-pointer relative overflow-hidden",
                                isSelf ? "bg-electric-blue text-white shadow-[8px_8px_0px_#000] scale-[1.02] z-10" : "bg-white text-black"
                              )}
                            >
                              <div className="flex items-center gap-4 pl-2">
                                <div className={cn("font-heading-md text-[24px] w-12 text-center", isSelf ? "text-white" : "text-on-surface-variant")}>
                                  {entry.rank}
                                </div>
                                <div className="w-12 h-12 rounded-full border-2 border-black bg-sticker-purple overflow-hidden flex items-center justify-center font-bold text-black">
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
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
    </>
  );
}
