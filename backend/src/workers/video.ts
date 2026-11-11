import { randomUUID } from "node:crypto";
import { Worker } from "bullmq";
import { getOpenAI } from "../lib/openai.js";
import { getRedisConnection } from "../lib/redis.js";
import { uploadGenerationAsset } from "../lib/storage.js";
import {
  VIDEO_QUEUE_NAME,
  type VideoJobData,
} from "../queues/video-queue.js";
import { refundCredits } from "../services/credits.js";
import {
  getGenerationById,
  updateGeneration,
} from "../services/generations.js";

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_MS = 15 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function failAndRefund(job: VideoJobData, reason: string) {
  console.error(`Video job ${job.generationId} failed: ${reason}`);

  await updateGeneration(job.generationId, {
    status: "failed",
    resultJson: {
      error: reason,
    },
  }).catch((error) => {
    console.error("Failed to mark video generation failed", error);
  });

  if (job.creditsUsed > 0) {
    await refundCredits(
      job.userId,
      job.creditsUsed,
      "video_generate_refund",
      `video_refund_${job.generationId}`,
    ).catch((error) => {
      console.error("Failed to refund video credits", error);
    });
  }
}

async function processVideoJob(job: VideoJobData) {
  const existing = await getGenerationById(job.generationId);
  if (!existing) {
    throw new Error(`Generation ${job.generationId} not found`);
  }

  if (existing.status === "completed" && existing.result_url) {
    return { skipped: true as const };
  }

  await updateGeneration(job.generationId, {
    status: "processing",
  });

  const openai = getOpenAI();
  const model = process.env.OPENAI_VIDEO_MODEL ?? "sora-2";

  const created = await openai.videos.create({
    model,
    prompt: job.prompt.slice(0, 3900),
    size: job.size,
    seconds: job.seconds,
  });

  await updateGeneration(job.generationId, {
    resultJson: {
      providerVideoId: created.id,
      size: job.size,
      seconds: job.seconds,
      progress: created.progress ?? 0,
    },
  });

  const startedAt = Date.now();
  let current = created;

  while (current.status === "queued" || current.status === "in_progress") {
    if (Date.now() - startedAt > MAX_POLL_MS) {
      throw new Error("Video generation timed out while waiting for completion");
    }

    await sleep(POLL_INTERVAL_MS);
    current = await openai.videos.retrieve(created.id);

    await updateGeneration(job.generationId, {
      resultJson: {
        providerVideoId: current.id,
        size: job.size,
        seconds: job.seconds,
        progress: current.progress ?? 0,
        providerStatus: current.status,
      },
    }).catch(() => {
      // Non-fatal progress update failure
    });
  }

  if (current.status === "failed") {
    const message =
      current.error?.message ?? "Video provider reported a failed job";
    throw new Error(message);
  }

  const download = await openai.videos.downloadContent(current.id);
  if (!download.ok) {
    throw new Error(`Failed to download video content (${download.status})`);
  }

  const contentType = download.headers.get("content-type") ?? "video/mp4";
  const arrayBuffer = await download.arrayBuffer();
  const extension = contentType.includes("webm") ? "webm" : "mp4";

  const publicUrl = await uploadGenerationAsset({
    userId: job.userId,
    generationId: job.generationId,
    filename: `${randomUUID()}.${extension}`,
    bytes: Buffer.from(arrayBuffer),
    contentType,
  });

  await updateGeneration(job.generationId, {
    status: "completed",
    resultUrl: publicUrl,
    resultJson: {
      providerVideoId: current.id,
      size: job.size,
      seconds: job.seconds,
      progress: 100,
      providerStatus: current.status,
    },
  });

  return { url: publicUrl };
}

const worker = new Worker<VideoJobData>(
  VIDEO_QUEUE_NAME,
  async (bullJob) => {
    try {
      return await processVideoJob(bullJob.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown video worker error";
      const attempts = bullJob.opts.attempts ?? 1;
      const isLastAttempt = bullJob.attemptsMade + 1 >= attempts;

      if (isLastAttempt) {
        await failAndRefund(bullJob.data, message);
      } else {
        await updateGeneration(bullJob.data.generationId, {
          status: "queued",
          resultJson: {
            error: message,
            retrying: true,
          },
        }).catch(() => undefined);
      }

      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 1,
  },
);

worker.on("ready", () => {
  console.log(`Video worker listening on queue "${VIDEO_QUEUE_NAME}"`);
});

worker.on("completed", (job) => {
  console.log(`Video job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Video job failed: ${job?.id}`, error);
});

async function shutdown() {
  console.log("Shutting down video worker…");
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
