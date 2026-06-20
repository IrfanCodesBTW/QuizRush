import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AuthMode } from "../quizrush-experience";

export interface AuthViewProps {
  [key: string]: any;
}

export function AuthView(props: AuthViewProps) {
  const {
    authMode,
    setAuthMode,
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    authenticate,
    loading
  } = props;

  return (
    <>
{/* Authentication Screen */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <section className="grid min-h-[75vh] items-center gap-6 lg:grid-cols-[1.1fr_0.9fr] w-full mt-4">
              <div className="max-w-3xl">
                <div className="mb-6 inline-flex items-center gap-2.5 rounded-full bg-white border-2 border-black px-4 py-2 text-sm font-bold shadow-[3px_3px_0px_#000]">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error-red opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-error-red"></span>
                  </span>
                  <span className="font-label-bold uppercase text-error-red font-black tracking-wider">Live</span>
                </div>
                <h2 className="font-hero-xxl text-[42px] sm:text-[56px] md:text-[72px] lg:text-[100px] text-black uppercase tracking-tighter drop-shadow-[5px_5px_0px_#C9A8FF] leading-tight md:leading-none mb-6">
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

              <div className="bg-white border-4 border-black rounded-poster p-8 brutalist-shadow w-full max-w-md mx-auto">
                <div className="mb-6 flex rounded-full bg-surface-container p-1 border-2 border-black">
                  {(["guest", "login", "register"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAuthMode(mode)}
                      className={cn(
                        "flex-1 rounded-full py-2.5 font-label-bold text-label-bold transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] uppercase text-[13px] md:text-[15px] cursor-pointer focus-visible:outline-2 focus-visible:outline-black",
                        authMode === mode
                          ? "bg-emoji-yellow text-black border-2 border-black shadow-[2px_2px_0px_#000] active:scale-[0.97] active:translate-y-0 active:shadow-[0px_0px_0px_#000]"
                          : "text-on-surface-variant hover:text-black active:scale-[0.97]"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {props.error && (
                  <div className="mb-4 rounded-poster border-4 border-black bg-error-container p-4 text-body-md font-bold text-on-error-container brutalist-shadow">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined font-black">error</span>
                      <span>{props.error}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={authMode === "guest" ? "Display name, optional" : "Username, optional"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white border-4 border-black rounded-full px-6 py-4 font-body-lg text-body-lg placeholder:text-secondary focus:outline-none focus-visible:ring-4 focus-visible:ring-electric-blue/30 text-[18px]"
                  />
                  {authMode !== "guest" && (
                    <>
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white border-4 border-black rounded-full px-6 py-4 font-body-lg text-body-lg placeholder:text-secondary focus:outline-none focus-visible:ring-4 focus-visible:ring-electric-blue/30 text-[18px]"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white border-4 border-black rounded-full px-6 py-4 font-body-lg text-body-lg placeholder:text-secondary focus:outline-none focus-visible:ring-4 focus-visible:ring-electric-blue/30 text-[18px]"
                      />
                    </>
                  )}
                  <button
                    onClick={authenticate}
                    disabled={loading === "auth"}
                    className="w-full bg-electric-blue text-white border-4 border-black rounded-full py-4 flex items-center justify-center gap-2 font-heading-md text-[24px] uppercase brutalist-shadow-hover transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out-brutal)] active:scale-[0.97] active:translate-y-0 active:shadow-[2px_2px_0px_#000] focus-visible:outline-4 focus-visible:outline-electric-blue focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined font-black text-[28px]">login</span>
                    <span>{loading === "auth" ? "Entering arena..." : "Enter QuizRush"}</span>
                  </button>
                </div>
              </div>
            </section>
          </motion.div>
    </>
  );
}
