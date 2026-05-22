import { db } from "../lib/db";
import { emitToPost } from "../sockets";
import { notificationService } from "./notification.service";
import { notFound } from "../utils/errors";

export const voteService = {
  async votePost(userId: string, postId: string, value: -1 | 0 | 1) {
    const post = await db.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true } });
    if (!post) throw notFound("Post");

    let shouldNotify = false;
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.postVote.findUnique({ where: { userId_postId: { userId, postId } } });
      const previousValue = (existing?.value ?? 0) as -1 | 0 | 1;
      const nextValue = value === 0 || existing?.value === value ? 0 : value;
      shouldNotify = nextValue === 1;

      if (nextValue === 0) {
        await tx.postVote.deleteMany({ where: { userId, postId } });
      } else if (existing) {
        await tx.postVote.update({
          where: { userId_postId: { userId, postId } },
          data: { value: nextValue },
        });
      } else {
        await tx.postVote.create({ data: { userId, postId, value: nextValue } });
      }

      return tx.post.update({
        where: { id: postId },
        data: {
          upvotes: { increment: (nextValue === 1 ? 1 : 0) - (previousValue === 1 ? 1 : 0) },
          downvotes: { increment: (nextValue === -1 ? 1 : 0) - (previousValue === -1 ? 1 : 0) },
          score: { increment: nextValue - previousValue },
        },
        select: { id: true, upvotes: true, downvotes: true, score: true, authorId: true },
      });
    });

    if (shouldNotify && result.authorId !== userId) {
      void notificationService.create({
        userId: result.authorId,
        actorId: userId,
        type: "UPVOTE",
        entityType: "post",
        entityId: postId,
        message: "Your post received an upvote",
      }).catch((error) => {
        console.error("Failed to create upvote notification", error);
      });
    }

    emitToPost(postId, "post:vote", result);
    return result;
  },

  async voteComment(userId: string, commentId: string, value: -1 | 0 | 1) {
    const comment = await db.comment.findFirst({ where: { id: commentId, deletedAt: null }, select: { id: true } });
    if (!comment) throw notFound("Comment");

    let shouldNotify = false;
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.commentVote.findUnique({ where: { userId_commentId: { userId, commentId } } });
      const previousValue = (existing?.value ?? 0) as -1 | 0 | 1;
      const nextValue = value === 0 || existing?.value === value ? 0 : value;
      shouldNotify = nextValue === 1;

      if (nextValue === 0) {
        await tx.commentVote.deleteMany({ where: { userId, commentId } });
      } else if (existing) {
        await tx.commentVote.update({
          where: { userId_commentId: { userId, commentId } },
          data: { value: nextValue },
        });
      } else {
        await tx.commentVote.create({ data: { userId, commentId, value: nextValue } });
      }

      return tx.comment.update({
        where: { id: commentId },
        data: {
          upvotes: { increment: (nextValue === 1 ? 1 : 0) - (previousValue === 1 ? 1 : 0) },
          downvotes: { increment: (nextValue === -1 ? 1 : 0) - (previousValue === -1 ? 1 : 0) },
          score: { increment: nextValue - previousValue },
        },
        select: { id: true, upvotes: true, downvotes: true, score: true, authorId: true, postId: true },
      });
    });

    if (shouldNotify && result.authorId !== userId) {
      void notificationService.create({
        userId: result.authorId,
        actorId: userId,
        type: "UPVOTE",
        entityType: "comment",
        entityId: commentId,
        message: "Your comment received an upvote",
      }).catch((error) => {
        console.error("Failed to create comment upvote notification", error);
      });
    }

    emitToPost(result.postId, "comment:vote", result);
    return result;
  },
};
