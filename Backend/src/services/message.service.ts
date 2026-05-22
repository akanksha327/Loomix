import { db } from "../lib/db";
import { forbidden, notFound } from "../utils/errors";
import { sanitizeText } from "../utils/sanitize";
import { emitToUser } from "../sockets";

const userSelect = { id: true, username: true, displayName: true, avatarUrl: true } as const;

const conversationInclude = {
  participants: { include: { user: { select: userSelect } } },
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: { sender: { select: userSelect } },
  },
} as const;

async function assertParticipant(conversationId: string, userId: string) {
  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true },
  });
  if (!participant) throw forbidden("Conversation access denied");
}

export const messageService = {
  async listConversations(userId: string) {
    return db.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      include: conversationInclude,
    });
  },

  async startConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw forbidden("You cannot message yourself");
    const target = await db.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw notFound("User");

    const existing = await db.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: conversationInclude,
    });
    if (existing) return existing;

    return db.conversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: conversationInclude,
    });
  },

  async listMessages(userId: string, conversationId: string) {
    await assertParticipant(conversationId, userId);
    await db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    return db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: userSelect } },
    });
  },

  async sendMessage(userId: string, conversationId: string, body: string) {
    await assertParticipant(conversationId, userId);
    const message = await db.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          body: sanitizeText(body),
        },
        include: { sender: { select: userSelect } },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      return created;
    });

    // Notify all participants of this conversation in realtime
    const participants = await db.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    for (const p of participants) {
      emitToUser(p.userId, "message:create", message);
    }

    return message;
  },
};
