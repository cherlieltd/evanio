import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";

export const VIDEO_QUEUE_NAME = "video-generation";

export type VideoJobData = {
  generationId: string;
  userId: string;
  prompt: string;
  size: "720x1280" | "1280x720" | "1024x1792" | "1792x1024";
  seconds: "4" | "8" | "12";
  creditsUsed: number;
};

let queue: Queue<VideoJobData> | null = null;

export function getVideoQueue(): Queue<VideoJobData> {
  if (queue) return queue;

  queue = new Queue<VideoJobData>(VIDEO_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 10_000,
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });

  return queue;
}
