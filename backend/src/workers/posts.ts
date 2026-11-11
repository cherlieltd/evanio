import { Worker } from "bullmq";
import { getRedisConnection } from "../lib/redis.js";
import {
  POST_QUEUE_NAME,
  type PostJobData,
} from "../queues/post-queue.js";
import { publishScheduledPost } from "../services/scheduled-posts.js";

const worker = new Worker<PostJobData>(
  POST_QUEUE_NAME,
  async (job) => {
    const result = await publishScheduledPost(job.data.postId);
    if (result.status === "failed") {
      throw new Error(result.error ?? "Post publish failed");
    }
    return { status: result.status, externalPostId: result.external_post_id };
  },
  {
    connection: getRedisConnection(),
    concurrency: 2,
  },
);

worker.on("ready", () => {
  console.log(`Posts worker listening on queue "${POST_QUEUE_NAME}"`);
});

worker.on("completed", (job) => {
  console.log(`Post job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Post job failed: ${job?.id}`, error);
});

async function shutdown() {
  console.log("Shutting down posts worker…");
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
