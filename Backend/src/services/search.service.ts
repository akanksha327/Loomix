import { db } from "../lib/db";
import { getPagination, paginationMeta } from "../utils/pagination";

export const searchService = {
  async search(query: { q: string; type: string; page?: number; limit?: number }) {
    const pagination = getPagination(query);
    const text = query.q.trim();
    const mode = "insensitive" as const;
    const results: Record<string, unknown> = {};

    if (query.type === "all" || query.type === "communities") {
      const [items, total] = await Promise.all([
        db.community.findMany({
          where: {
            deletedAt: null,
            OR: [{ name: { contains: text, mode } }, { description: { contains: text, mode } }],
          },
          take: pagination.take,
          skip: pagination.skip,
          orderBy: [{ memberCount: "desc" }, { createdAt: "desc" }],
        }),
        db.community.count({
          where: {
            deletedAt: null,
            OR: [{ name: { contains: text, mode } }, { description: { contains: text, mode } }],
          },
        }),
      ]);
      results.communities = { items, meta: paginationMeta(pagination.page, pagination.limit, total) };
    }

    if (query.type === "all" || query.type === "posts") {
      const [items, total] = await Promise.all([
        db.post.findMany({
          where: {
            deletedAt: null,
            published: true,
            OR: [{ title: { contains: text, mode } }, { content: { contains: text, mode } }, { tags: { has: text } }],
          },
          take: pagination.take,
          skip: pagination.skip,
          orderBy: [{ score: "desc" }, { createdAt: "desc" }],
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            community: { select: { id: true, name: true, slug: true } },
          },
        }),
        db.post.count({
          where: {
            deletedAt: null,
            published: true,
            OR: [{ title: { contains: text, mode } }, { content: { contains: text, mode } }, { tags: { has: text } }],
          },
        }),
      ]);
      results.posts = { items, meta: paginationMeta(pagination.page, pagination.limit, total) };
    }

    if (query.type === "all" || query.type === "users") {
      const [items, total] = await Promise.all([
        db.user.findMany({
          where: {
            deletedAt: null,
            OR: [{ id: text }, { username: { contains: text, mode } }, { displayName: { contains: text, mode } }],
          },
          take: pagination.take,
          skip: pagination.skip,
          orderBy: { createdAt: "desc" },
          select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
        }),
        db.user.count({
          where: {
            deletedAt: null,
            OR: [{ id: text }, { username: { contains: text, mode } }, { displayName: { contains: text, mode } }],
          },
        }),
      ]);
      results.users = { items, meta: paginationMeta(pagination.page, pagination.limit, total) };
    }

    if (query.type === "all" || query.type === "tags") {
      const posts = await db.post.findMany({
        where: { deletedAt: null, published: true, tags: { hasSome: [text] } },
        take: pagination.take,
        select: { tags: true },
      });
      results.tags = Array.from(new Set(posts.flatMap((post) => post.tags))).filter((tag) => tag.includes(text));
    }

    return results;
  },
};
