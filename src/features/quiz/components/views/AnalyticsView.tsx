import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, BarChart, Bar, Cell, Tooltip } from "recharts";

export interface AnalyticsViewProps {
  [key: string]: any;
}

export function AnalyticsView(props: AnalyticsViewProps) {
  const {
    error,
    currentPlayer,
    snapshot,
    accuracyStats,
    paceData,
    avgPace
  } = props;

  return (
    <>
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
                          <motion.div 
                            className="space-y-4"
                            variants={{
                              hidden: {},
                              visible: { transition: { staggerChildren: 0.05 } }
                            }}
                            initial="hidden"
                            animate="visible"
                          >
                            {accuracyStats.map((stat: any, index: number) => (
                              <motion.div 
                                key={stat.topic} 
                                variants={{
                                  hidden: { opacity: 0, x: -15 },
                                  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
                                }}
                                className="group"
                              >
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
                                      "h-full border-r-2 border-black transition-colors duration-200 duration-1000 group-hover:bg-rocket-orange",
                                      stat.answered ? (stat.correct ? "bg-primary-container" : "bg-error-red") : "bg-secondary-container"
                                    )}
                                    style={{ width: stat.percentage + "%" }}
                                  ></div>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
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
                          <div className="h-52 w-full mt-auto">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={paceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.15)" />
                                <XAxis dataKey="name" tick={{ fill: '#000', fontSize: 10, fontWeight: 'bold' }} />
                                <YAxis tickFormatter={(val) => `${val}s`} tick={{ fill: '#000', fontSize: 10 }} />
                                <Tooltip formatter={(value) => [`${value}s`, "Response Time"]} />
                                <Bar dataKey="pace" radius={[4, 4, 0, 0]}>
                                  {paceData.map((entry: any, index: number) => (
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
                          <motion.div 
                            className="grid grid-cols-2 gap-4 flex-1 items-center"
                            variants={{
                              hidden: {},
                              visible: { transition: { staggerChildren: 0.08 } }
                            }}
                            initial="hidden"
                            animate="visible"
                          >
                            {/* Fast Thinker Sticker */}
                            <motion.div
                              variants={{
                                hidden: { opacity: 0, scale: 0.8 },
                                visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 10 } }
                              }}
                              className={cn(
                                "border-4 border-black rounded-xl p-3 flex flex-col items-center justify-center text-center brutalist-shadow-sm sticker-float transition-colors duration-200",
                                currentPlayer && currentPlayer.score > 1500 ? "bg-white opacity-100" : "bg-surface-container opacity-40 border-dashed"
                              )}
                              style={{ animationDelay: "0s" }}
                            >
                              <div className="w-10 h-10 bg-electric-blue rounded-full border-2 border-black flex items-center justify-center mb-2 shadow-[2px_2px_0px_#000]">
                                <span className="material-symbols-outlined text-white text-[20px]">bolt</span>
                              </div>
                              <span className="font-label-bold text-[10px] text-black uppercase">Fast Thinker</span>
                            </motion.div>

                            {/* Streak Master Sticker */}
                            <motion.div
                              variants={{
                                hidden: { opacity: 0, scale: 0.8 },
                                visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 10 } }
                              }}
                              className={cn(
                                "border-4 border-black rounded-xl p-3 flex flex-col items-center justify-center text-center brutalist-shadow-sm sticker-float transition-colors duration-200",
                                currentPlayer && currentPlayer.streak >= 3 ? "bg-white opacity-100" : "bg-surface-container opacity-40 border-dashed"
                              )}
                              style={{ animationDelay: "0.5s" }}
                            >
                              <div className="w-10 h-10 bg-rocket-orange rounded-full border-2 border-black flex items-center justify-center mb-2 shadow-[2px_2px_0px_#000]">
                                <span className="material-symbols-outlined text-white text-[20px]">local_fire_department</span>
                              </div>
                              <span className="font-label-bold text-[10px] text-black uppercase">Streak Master</span>
                            </motion.div>

                            {/* Nerd King Sticker */}
                            <motion.div
                              variants={{
                                hidden: { opacity: 0, scale: 0.8 },
                                visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 10 } }
                              }}
                              className={cn(
                                "border-4 border-black rounded-xl p-3 flex flex-col items-center justify-center text-center brutalist-shadow-sm sticker-float transition-colors duration-200",
                                currentPlayer && currentPlayer.score > 3500 ? "bg-white opacity-100" : "bg-surface-container opacity-40 border-dashed"
                              )}
                              style={{ animationDelay: "1s" }}
                            >
                              <div className="w-10 h-10 bg-primary-container rounded-full border-2 border-black flex items-center justify-center mb-2 shadow-[2px_2px_0px_#000]">
                                <span className="material-symbols-outlined text-black text-[20px]">school</span>
                              </div>
                              <span className="font-label-bold text-[10px] text-black uppercase">Nerd King</span>
                            </motion.div>

                            {/* Champion Sticker */}
                            <motion.div
                              variants={{
                                hidden: { opacity: 0, scale: 0.8 },
                                visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 10 } }
                              }}
                              className={cn(
                                "border-4 border-black rounded-xl p-3 flex flex-col items-center justify-center text-center brutalist-shadow-sm sticker-float transition-colors duration-200",
                                snapshot.leaderboard[0]?.id === currentPlayer?.id && snapshot.room.status === "ended" ? "bg-white opacity-100" : "bg-surface-container opacity-40 border-dashed"
                              )}
                              style={{ animationDelay: "1.5s" }}
                            >
                              <div className="w-10 h-10 bg-emoji-yellow rounded-full border-2 border-black flex items-center justify-center mb-2 shadow-[2px_2px_0px_#000]">
                                <span className="material-symbols-outlined text-black text-[20px]">workspace_premium</span>
                              </div>
                              <span className="font-label-bold text-[10px] text-black uppercase">Champion</span>
                            </motion.div>
                          </motion.div>
                        </div>
                      </section>
                    </div>
                  </div>
                </motion.div>
    </>
  );
}
