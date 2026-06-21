import { createServer } from "node:http";
import { Server } from "socket.io";
import { allRoomsPattern } from "../src/server/valkey/keys";
import { getValkeyStore } from "../src/server/valkey/store";
import { getDeploymentReadiness, validateProductionEnvironment } from "../src/server/config/env";

validateProductionEnvironment();

const port = Number(process.env.PORT || process.env.SOCKET_PORT || 4001);
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const valkey = getValkeyStore();

const httpServer = createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      ok: true,
      service: "quizrush-realtime",
      valkeyMode: valkey.mode,
      readiness: getDeploymentReadiness(),
    }),
  );
});

const io = new Server(httpServer, {
  cors: {
    origin: appUrl,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("room:join", (roomCode: string) => {
    if (typeof roomCode === "string" && roomCode.startsWith("QR-")) {
      socket.join(roomCode);
    }
  });

  socket.on("room:leave", (roomCode: string) => {
    if (typeof roomCode === "string") {
      socket.leave(roomCode);
    }
  });
});

await valkey.subscribe(allRoomsPattern, (channel, payload) => {
  const roomCode = channel.split(":").at(-1);
  if (!roomCode) {
    return;
  }

  io.to(roomCode).emit("room:event", JSON.parse(payload));
});

httpServer.listen(port, () => {
  console.log(`QuizRush realtime server listening on http://localhost:${port}`);
  console.log(`Valkey transport: ${valkey.mode}`);
});
