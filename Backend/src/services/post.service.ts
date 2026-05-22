import { db } from "../lib/db";
import { requireCommunityRole } from "./community.service";
import { badRequest, forbidden, notFound } from "../utils/errors";
import { getPagination } from "../utils/pagination";
import { sanitizeText } from "../utils/sanitize";

const postInclude = {
  author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  community: { select: { id: true, name: true, slug: true, avatarUrl: true } },
} as const;

const postListInclude = (viewerId?: string) => ({
  ...postInclude,
  _count: { select: { comments: true, savedBy: true } },
  votes: viewerId ? { where: { userId: viewerId }, select: { value: true } } : false,
  savedBy: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
});

const PUBLIC_LIST_CACHE_TTL_MS = 10_000;
const publicListCache = new Map<string, { expiresAt: number; value: any }>();

function clearPublicListCache() {
  publicListCache.clear();
}

function publicListCacheKey(query: { page?: number; limit?: number; sort?: string; community?: string; author?: string; tag?: string }) {
  return JSON.stringify({
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    sort: query.sort ?? "new",
    community: query.community ?? "",
    author: query.author ?? "",
    tag: query.tag ?? "",
  });
}

function orderFor(sort?: string) {
  if (sort === "top") return [{ score: "desc" as const }, { createdAt: "desc" as const }];
  if (sort === "trending") return [{ commentCount: "desc" as const }, { score: "desc" as const }, { createdAt: "desc" as const }];
  return [{ createdAt: "desc" as const }];
}

export const postService = {
  async create(userId: string, input: {
    title: string;
    content?: string;
    type: "TEXT" | "IMAGE" | "LINK" | "MEDIA";
    url?: string;
    mediaUrl?: string;
    communityId?: string;
    tags?: string[];
  }) {
    if (input.communityId) {
      const community = await db.community.findFirst({ where: { id: input.communityId, deletedAt: null }, select: { id: true } });
      if (!community) throw notFound("Community");
    }

    const post = await db.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          title: sanitizeText(input.title),
          content: input.content ? sanitizeText(input.content) : undefined,
          type: input.type,
          url: input.url,
          mediaUrl: input.mediaUrl,
          tags: input.tags ?? [],
          authorId: userId,
          communityId: input.communityId,
        },
        include: postInclude,
      });

      if (input.communityId) {
        await tx.community.update({ where: { id: input.communityId }, data: { postCount: { increment: 1 } } });
      }

      return post;
    });

    clearPublicListCache();
    return post;
  },

  async list(query: { page?: number; limit?: number; sort?: string; community?: string; author?: string; tag?: string }, viewerId?: string) {
    const cacheKey = !viewerId ? publicListCacheKey(query) : null;
    if (cacheKey) {
      const cached = publicListCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
      publicListCache.delete(cacheKey);
    }

    const pagination = getPagination(query);
    const where = {
      deletedAt: null,
      published: true,
      ...(query.community ? { community: { slug: query.community } } : {}),
      ...(query.author ? { author: { username: query.author } } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
    };

    const items = await db.post.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take + 1,
      orderBy: orderFor(query.sort),
      include: postListInclude(viewerId),
    });
    const hasMore = items.length > pagination.take;

    const result = {
      items: hasMore ? items.slice(0, pagination.take) : items,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        hasMore,
        nextPage: hasMore ? pagination.page + 1 : null,
      },
    };

    if (cacheKey) {
      publicListCache.set(cacheKey, { value: result, expiresAt: Date.now() + PUBLIC_LIST_CACHE_TTL_MS });
    }

    return result;
  },

  async get(id: string, viewerId?: string) {
    const post = await db.post.findFirst({
      where: { id, deletedAt: null, published: true },
      include: {
        ...postInclude,
        _count: { select: { comments: true, savedBy: true } },
        votes: viewerId ? { where: { userId: viewerId }, select: { value: true } } : false,
        savedBy: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
      },
    });
    if (!post) throw notFound("Post");
    void db.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((error) => {
      console.error("Failed to increment post view count", error);
    });
    return post;
  },

  async update(userId: string, postId: string, input: Record<string, unknown>) {
    const post = await db.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true, communityId: true },
    });
    if (!post) throw notFound("Post");
    if (post.authorId !== userId && post.communityId) {
      await requireCommunityRole(userId, post.communityId, ["OWNER", "ADMIN", "MODERATOR"]);
    } else if (post.authorId !== userId) {
      throw forbidden();
    }

    const updated = await db.post.update({
      where: { id: postId },
      data: {
        title: typeof input.title === "string" ? sanitizeText(input.title) : undefined,
        content: typeof input.content === "string" ? sanitizeText(input.content) : undefined,
        ...(typeof input.type === "string" ? { type: input.type as "TEXT" | "IMAGE" | "LINK" | "MEDIA" } : {}),
        url: input.url as string | undefined,
        mediaUrl: input.mediaUrl as string | undefined,
        tags: Array.isArray(input.tags) ? (input.tags as string[]) : undefined,
      },
      include: postInclude,
    });
    clearPublicListCache();
    return updated;
  },

  async remove(userId: string, postId: string) {
    const post = await db.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true, communityId: true },
    });
    if (!post) throw notFound("Post");
    if (post.authorId !== userId && post.communityId) {
      await requireCommunityRole(userId, post.communityId, ["OWNER", "ADMIN", "MODERATOR"]);
    } else if (post.authorId !== userId) {
      throw forbidden();
    }

    await db.$transaction(async (tx) => {
      await tx.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
      if (post.communityId) {
        await tx.community.update({ where: { id: post.communityId }, data: { postCount: { decrement: 1 } } });
      }
    });
    clearPublicListCache();
  },

  async save(userId: string, postId: string) {
    const post = await db.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true } });
    if (!post) throw notFound("Post");
    return db.savedPost.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    });
  },

  async unsave(userId: string, postId: string) {
    await db.savedPost.deleteMany({ where: { userId, postId } });
  },

  assertPostType(input: { type: string; url?: string; mediaUrl?: string }) {
    if (input.type === "LINK" && !input.url) throw badRequest("Link posts require url");
    if (["IMAGE", "MEDIA"].includes(input.type) && !input.mediaUrl) throw badRequest("Media posts require mediaUrl");
  },
};
