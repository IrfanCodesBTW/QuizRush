import { motion, AnimatePresence } from "framer-motion";
import { cn, initials } from "@/lib/utils";

export interface ActivityFeedProps {
  [key: string]: any;
}

export function ActivityFeed(props: ActivityFeedProps) {
  const {
    username,
    currentPlayer,
    snapshot,
    runtime
  } = props;

  return (
    <>
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
                            const active = snapshot.events.some((e: any) => e.primitive === prim);
                            return (
                              <div
                                key={prim}
                                className={cn(
                                  "border-2 border-black rounded-xl p-3 font-label-bold text-label-bold uppercase flex items-center justify-between brutalist-shadow-sm",
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
                            <motion.div 
                              className="space-y-3"
                              variants={{
                                hidden: {},
                                visible: { transition: { staggerChildren: 0.05 } }
                              }}
                              initial="hidden"
                              animate="visible"
                            >
                              {snapshot.insights.map((insight: any, idx: number) => (
                                <motion.div 
                                  key={idx} 
                                  variants={{
                                    hidden: { opacity: 0, y: 10 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
                                  }}
                                  className="bg-surface-container border-2 border-black p-4 rounded-xl shadow-[2px_2px_0px_#000]"
                                >
                                  <div className="flex items-center justify-between border-b border-black/10 pb-1 mb-2">
                                    <span className="font-label-bold text-[12px] text-rocket-orange uppercase">{insight.agent}</span>
                                    <span className="bg-white border border-black px-2 py-0.5 rounded-full text-[10px] uppercase font-bold text-black">
                                      {insight.tone}
                                    </span>
                                  </div>
                                  <p className="font-body-md text-body-md text-black leading-relaxed">{insight.message}</p>
                                </motion.div>
                              ))}
                            </motion.div>
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
                      <div className="flex-1 overflow-y-auto max-h-[520px] pr-2 scrollbar-thin">
                        {snapshot.events.length === 0 ? (
                          <p className="font-body-md text-body-md text-on-surface-variant bg-surface-container p-4 rounded-xl border-2 border-dashed border-black/10 text-center">
                            Awaiting events from Valkey stream...
                          </p>
                        ) : (
                          <motion.div 
                            className="space-y-3"
                            variants={{
                              hidden: {},
                              visible: { transition: { staggerChildren: 0.03 } }
                            }}
                            initial="hidden"
                            animate="visible"
                          >
                            {snapshot.events.map((event: any) => (
                              <motion.div 
                                key={event.id} 
                                variants={{
                                  hidden: { opacity: 0, x: 10 },
                                  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 120, damping: 15 } }
                                }}
                                className="bg-white border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_#000]"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-label-bold text-[12px] text-electric-blue uppercase leading-none">{event.type}</span>
                                  <span className="bg-sticker-purple border border-black px-2 py-0.5 rounded text-[10px] font-bold text-black uppercase leading-none">
                                    {event.primitive}
                                  </span>
                                </div>
                                <p className="font-body-md text-body-md text-black leading-relaxed">{event.message}</p>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
    </>
  );
}
