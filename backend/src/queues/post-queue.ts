import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

export const POST_QUEUE_NAME = "scheduled-posts";

export type PostJobData = {
  postId: string;
  userId: string;
};

let queue: Queue<PostJobData> | null = null;

export function getPostQueue(): Queue<PostJobData> {
  if (queue) return queue;

  queue = new Queue<PostJobData>(POST_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 15_000,
      },
      removeOnComplete: 200,
      removeOnFail: 200,
    },
  });

  return queue;
}

export async function enqueueScheduledPost(input: {
  postId: string;
  userId: string;
  scheduledAt: Date;
}): Promise<void> {
  const delay = Math.max(input.scheduledAt.getTime() - Date.now(), 0);
  const queue = getPostQueue();

  await queue.add(
    "publish-post",
    { postId: input.postId, userId: input.userId },
    {
      jobId: `post_${input.postId}`,
      delay,
    },
  );
}
