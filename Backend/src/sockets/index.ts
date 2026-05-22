import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { isAllowedClientOrigin } from "../config/env";
import { verifyAccessToken } from "../utils/tokens";

let io: Server | undefined;

function parseCookie(cookieStr: string | undefined, key: string): string | undefined {
  if (!cookieStr) return undefined;
  const match = cookieStr.match(new RegExp(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`));
  return match ? decodeURIComponent(match[2]) : undefined;
}

export function initSockets(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        callback(null, isAllowedClientOrigin(origin));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers.cookie) {
      token = parseCookie(socket.handshake.headers.cookie, "accessToken");
    }
    if (!token) return next();

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
    }

    socket.on("join:post", (postId: string) => {
      if (postId) {
        socket.join(`post:${postId}`);
      }
    });

    socket.on("leave:post", (postId: string) => {
      if (postId) {
        socket.leave(`post:${postId}`);
      }
    });
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToPost(postId: string, event: string, payload: unknown) {
  io?.to(`post:${postId}`).emit(event, payload);
}
