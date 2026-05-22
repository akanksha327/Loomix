import { db } from "../lib/db";
import { conflict, forbidden, notFound } from "../utils/errors";
import { getPagination, paginationMeta } from "../utils/pagination";
import { sanitizeText } from "../utils/sanitize";
import { toSlug } from "../utils/slug";

async function ensureUniqueSlug(baseSlug: string) {
  let slug = baseSlug || "community";
  let suffix = 1;

  while (await db.community.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
}

export async function requireCommunityRole(userId: string, communityId: string, roles: string[]) {
  const member = await db.communityMember.findUnique({
    where: { userId_communityId: { userId, communityId } },
    select: { role: true },
  });

  if (!member || !roles.includes(member.role)) {
    throw forbidden("Community moderator access required");
  }
}

export const communityService = {
  async create(userId: string, input: {
    name: string;
    description?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    visibility?: "PUBLIC" | "RESTRICTED" | "PRIVATE";
  }) {
    const nameExists = await db.community.findUnique({ where: { name: input.name }, select: { id: true } });
    if (nameExists) throw conflict("Community name is already taken");

    const slug = await ensureUniqueSlug(toSlug(input.name));
    return db.$transaction(async (tx) => {
      const community = await tx.community.create({
        data: {
          name: input.name,
          slug,
          description: input.description ? sanitizeText(input.description) : undefined,
          avatarUrl: input.avatarUrl,
          bannerUrl: input.bannerUrl,
          visibility: input.visibility,
          creatorId: userId,
        },
      });

      await tx.communityMember.create({
        data: { communityId: community.id, userId, role: "OWNER" },
      });

      return community;
    });
  },

  async list(query: unknown) {
    const pagination = getPagination(query);
    const parsed = query as { search?: string; sort?: string };
    const where = {
      deletedAt: null,
      ...(parsed.search
        ? {
            OR: [
              { name: { contains: parsed.search, mode: "insensitive" as const } },
              { description: { contains: parsed.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const orderBy = parsed.sort === "new" ? { createdAt: "desc" as const } : { memberCount: "desc" as const };

    const [items, total] = await Promise.all([
      db.community.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy }),
      db.community.count({ where }),
    ]);
    return { items, meta: paginationMeta(pagination.page, pagination.limit, total) };
  },

  async trending(limit = 10) {
    return db.community.findMany({
      where: { deletedAt: null },
      take: limit,
      orderBy: [{ memberCount: "desc" }, { postCount: "desc" }],
    });
  },

  async getBySlug(slug: string) {
    const community = await db.community.findFirst({
      where: { slug, deletedAt: null },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        members: {
          where: { role: { in: ["OWNER", "ADMIN", "MODERATOR"] } },
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        },
      },
    });
    if (!community) throw notFound("Community");
    return community;
  },

  async update(userId: string, slug: string, input: Record<string, unknown>) {
    const community = await db.community.findFirst({ where: { slug, deletedAt: null }, select: { id: true } });
    if (!community) throw notFound("Community");
    await requireCommunityRole(userId, community.id, ["OWNER", "ADMIN", "MODERATOR"]);

    return db.community.update({
      where: { id: community.id },
      data: {
        description: typeof input.description === "string" ? sanitizeText(input.description) : undefined,
        avatarUrl: input.avatarUrl as string | undefined,
        bannerUrl: input.bannerUrl as string | undefined,
        ...(typeof input.visibility === "string" ? { visibility: input.visibility as "PUBLIC" | "RESTRICTED" | "PRIVATE" } : {}),
      },
    });
  },

  async remove(userId: string, slug: string) {
    const community = await db.community.findFirst({ where: { slug, deletedAt: null }, select: { id: true } });
    if (!community) throw notFound("Community");
    await requireCommunityRole(userId, community.id, ["OWNER", "ADMIN"]);
    await db.community.update({ where: { id: community.id }, data: { deletedAt: new Date() } });
  },

  async join(userId: string, slug: string) {
    const community = await db.community.findFirst({ where: { slug, deletedAt: null }, select: { id: true } });
    if (!community) throw notFound("Community");

    return db.$transaction(async (tx) => {
      const existing = await tx.communityMember.findUnique({
        where: { userId_communityId: { userId, communityId: community.id } },
      });
      if (existing) return existing;

      const membership = await tx.communityMember.create({ data: { userId, communityId: community.id } });
      await tx.community.update({
        where: { id: community.id },
        data: { memberCount: { increment: 1 } },
      });
      return membership;
    });
  },

  async leave(userId: string, slug: string) {
    const community = await db.community.findFirst({ where: { slug, deletedAt: null }, select: { id: true } });
    if (!community) throw notFound("Community");

    await db.$transaction(async (tx) => {
      const member = await tx.communityMember.findUnique({
        where: { userId_communityId: { userId, communityId: community.id } },
      });
      if (!member || member.role === "OWNER") return;
      await tx.communityMember.delete({ where: { id: member.id } });
      await tx.community.update({ where: { id: community.id }, data: { memberCount: { decrement: 1 } } });
    });
  },
};
