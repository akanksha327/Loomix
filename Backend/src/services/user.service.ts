import { db } from "../lib/db";
import { conflict, forbidden, notFound } from "../utils/errors";
import { getPagination, paginationMeta } from "../utils/pagination";
import { sanitizeText } from "../utils/sanitize";

const USERNAME_COOLDOWN_DAYS = 60;

function pageMeta(page: number, limit: number, hasMore: boolean) {
  return {
    page,
    limit,
    hasMore,
    nextPage: hasMore ? page + 1 : null,
  };
}

const userPublicSelect = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  bannerUrl: true,
  createdAt: true,
  _count: {
    select: {
      posts: true,
      comments: true,
      followers: true,
      following: true,
      memberships: true,
    },
  },
} as const;

export const userService = {
  async getProfile(username: string) {
    const user = await db.user.findFirst({
      where: { username: username.toLowerCase(), deletedAt: null },
      select: userPublicSelect,
    });
    if (!user) throw notFound("User");
    return user;
  },

  async getMe(userId: string) {
    const user = await db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        ...userPublicSelect,
        email: true,
        provider: true,
        emailVerified: true,
        usernameChangedAt: true,
      },
    });
    if (!user) throw notFound("User");
    return user;
  },

  async updateMe(userId: string, input: { displayName?: string; bio?: string; avatarUrl?: string; bannerUrl?: string }) {
    return db.user.update({
      where: { id: userId },
      data: {
        displayName: input.displayName,
        bio: input.bio ? sanitizeText(input.bio) : undefined,
        avatarUrl: input.avatarUrl,
        bannerUrl: input.bannerUrl,
      },
      select: userPublicSelect,
    });
  },

  async updateUsername(userId: string, newUsername: string) {
    const lower = newUsername.toLowerCase();

    // Check cooldown
    const currentUser = await db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { username: true, usernameChangedAt: true },
    });
    if (!currentUser) throw notFound("User");

    // If username is the same, no-op
    if (currentUser.username === lower) {
      return { username: lower, usernameChangedAt: currentUser.usernameChangedAt };
    }

    // Check 60-day cooldown
    if (currentUser.usernameChangedAt) {
      const daysSinceChange = Math.floor(
        (Date.now() - new Date(currentUser.usernameChangedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceChange < USERNAME_COOLDOWN_DAYS) {
        const daysRemaining = USERNAME_COOLDOWN_DAYS - daysSinceChange;
        throw conflict(`You can change your username again in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`);
      }
    }

    // Check uniqueness
    const existing = await db.user.findUnique({ where: { username: lower }, select: { id: true } });
    if (existing && existing.id !== userId) throw conflict("Username is already taken");

    const updated = await db.user.update({
      where: { id: userId },
      data: { username: lower, usernameChangedAt: new Date() },
      select: { username: true, usernameChangedAt: true },
    });

    return updated;
  },

  async checkUsername(username: string, currentUserId?: string) {
    const lower = username.toLowerCase();
    const existing = await db.user.findUnique({ where: { username: lower }, select: { id: true } });
    const available = !existing || (currentUserId ? existing.id === currentUserId : false);
    return { available, username: lower };
  },

  async deleteMe(userId: string) {
    await db.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), email: `deleted-${userId}@deleted.local`, username: `deleted-${userId}` },
    });
    await db.session.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
  },

  async listUserPosts(username: string, query: unknown) {
    const user = await db.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (!user) throw notFound("User");
    const pagination = getPagination(query);
    const where = { authorId: user.id, deletedAt: null, published: true };
    const items = await db.post.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take + 1,
      orderBy: { createdAt: "desc" },
      include: { community: { select: { id: true, name: true, slug: true } } },
    });
    const hasMore = items.length > pagination.take;
    return {
      items: hasMore ? items.slice(0, pagination.take) : items,
      meta: pageMeta(pagination.page, pagination.limit, hasMore),
    };
  },

  async listUserComments(username: string, query: unknown) {
    const user = await db.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (!user) throw notFound("User");
    const pagination = getPagination(query);
    const where = { authorId: user.id, deletedAt: null };
    const [items, total] = await Promise.all([
      db.comment.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: "desc" },
        include: { post: { select: { id: true, title: true } } },
      }),
      db.comment.count({ where }),
    ]);
    return { items, meta: paginationMeta(pagination.page, pagination.limit, total) };
  },

  async savedPosts(userId: string, query: unknown) {
    const pagination = getPagination(query);
    const items = await db.savedPost.findMany({
      where: { userId },
      skip: pagination.skip,
      take: pagination.take + 1,
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            community: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    const hasMore = items.length > pagination.take;
    const visibleItems = hasMore ? items.slice(0, pagination.take) : items;
    return {
      items: visibleItems.map((item) => item.post),
      meta: pageMeta(pagination.page, pagination.limit, hasMore),
    };
  },

  async followers(userId: string) {
    return db.follow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: "desc" },
      include: { follower: { select: userPublicSelect } },
    });
  },

  async following(userId: string) {
    return db.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: "desc" },
      include: { following: { select: userPublicSelect } },
    });
  },

  async follow(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw forbidden("You cannot follow yourself");
    const target = await db.user.findFirst({ where: { id: targetUserId, deletedAt: null }, select: { id: true } });
    if (!target) throw notFound("User");

    return db.follow.upsert({
      where: { followerId_followingId: { followerId: userId, followingId: targetUserId } },
      create: { followerId: userId, followingId: targetUserId },
      update: {},
    });
  },

  async unfollow(userId: string, targetUserId: string) {
    await db.follow.deleteMany({ where: { followerId: userId, followingId: targetUserId } });
  },

  async block(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw forbidden("You cannot block yourself");
    const target = await db.user.findFirst({ where: { id: targetUserId, deletedAt: null }, select: { id: true } });
    if (!target) throw notFound("User");

    await db.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId, followingId: targetUserId },
          { followerId: targetUserId, followingId: userId },
        ],
      },
    });

    return db.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetUserId } },
      create: { blockerId: userId, blockedId: targetUserId },
      update: {},
    });
  },

  async unblock(userId: string, targetUserId: string) {
    await db.blockedUser.deleteMany({ where: { blockerId: userId, blockedId: targetUserId } });
  },

  async ensureUniqueUsername(username: string) {
    const existing = await db.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (existing) throw conflict("Username is already taken");
  },

  async listSessions(userId: string) {
    return db.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async revokeAllSessions(userId: string, currentSessionId?: string) {
    const where: Record<string, unknown> = { userId, revokedAt: null };
    if (currentSessionId) {
      where.id = { not: currentSessionId };
    }
    await db.session.updateMany({ where, data: { revokedAt: new Date() } });
  },
};
