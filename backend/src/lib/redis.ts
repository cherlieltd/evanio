import { Redis } from "ioredis";

let connection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (connection) return connection;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("Missing environment variable REDIS_URL");
  }

  connection = new Redis(url, {
    maxRetriesPerRequest: null,
  });

  return connection;
}
