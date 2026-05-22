import type { Prisma } from "@prisma/client";
import { db } from "../lib/db";
import { emitToUser } from "../sockets";
import { getPagination, paginationMeta } from "../utils/pagination";

type NotificationFilterType = "UPVOTE" | "REPLY" | "MENTION" | "FOLLOW" | "COMMUNITY_INVITE" | "MODERATION";

export const notificationService = {
  async create(input: {
    userId: string;
    actorId?: string;
    type: "UPVOTE" | "REPLY" | "MENTION" | "FOLLOW" | "COMMUNITY_INVITE" | "MODERATION";
    message: string;
    entityType?: string;
    entityId?: string;
    data?: Prisma.InputJsonValue;
  }) {
    if (input.actorId && input.actorId === input.userId) return null;

    const notification = await db.notification.create({
      data: input,
    });
    emitToUser(input.userId, "notification:new", notification);
    return notification;
  },

  async list(userId: string, query: { page?: number; limit?: number; unreadOnly?: boolean; type?: NotificationFilterType }) {
    const pagination = getPagination(query);
    const where = {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      items,
      meta: { ...paginationMeta(pagination.page, pagination.limit, total), unreadCount },
    };
  },

  async markRead(userId: string, id: string) {
    return db.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  },

  async markAllRead(userId: string) {
    return db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
};
