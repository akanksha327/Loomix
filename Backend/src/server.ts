import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { db } from "./lib/db";
import { initSockets } from "./sockets";

const app = createApp();
const server = http.createServer(app);

initSockets(server);

server.listen(env.BACKEND_PORT, () => {
  console.log(`Backend API listening on port ${env.BACKEND_PORT}`);
});

process.on("SIGTERM", async () => {
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
});
