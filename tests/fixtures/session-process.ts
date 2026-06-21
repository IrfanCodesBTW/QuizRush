import { signSession, verifySession } from "../../src/server/auth/session";

const [action, token] = process.argv.slice(2);

if (action === "sign") {
  const signed = await signSession({
    playerId: "cross-node-player",
    username: "LoadBalancerTest",
    isGuest: true,
  });
  process.stdout.write(signed);
} else if (action === "verify") {
  const session = await verifySession(token);
  process.stdout.write(JSON.stringify(session));
} else {
  throw new Error("Expected sign or verify action.");
}
