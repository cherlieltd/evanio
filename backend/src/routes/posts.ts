import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth.js";
import {
  cancelScheduledPost,
  createScheduledPost,
  createScheduledPostSchema,
  listScheduledPostsForUser,
} from "../services/scheduled-posts.js";
import type { AppVariables } from "../types/context.js";

export const postsRoutes = new Hono<{ Variables: AppVariables }>();

postsRoutes.get("/posts", requireAuth, async (c) => {
  const user = c.get("user");
  const from = c.req.query("from") ?? undefined;
  const to = c.req.query("to") ?? undefined;
  const limit = Number(c.req.query("limit") ?? "100");

  try {
    const posts = await listScheduledPostsForUser(user.id, {
      from,
      to,
      limit: Number.isFinite(limit) ? limit : 100,
    });
    return c.json({ posts });
  } catch (error) {
    console.error("GET /posts failed", error);
    return c.json({ error: "Failed to load posts" }, 500);
  }
});

postsRoutes.post("/posts", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = createScheduledPostSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      400,
    );
  }

  try {
    const post = await createScheduledPost(user.id, parsed.data);
    return c.json({ post }, 201);
  } catch (error) {
    console.error("POST /posts failed", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to schedule post",
      },
      500,
    );
  }
});

postsRoutes.post("/posts/:id/cancel", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  try {
    const post = await cancelScheduledPost(user.id, id);
    return c.json({ post });
  } catch (error) {
    console.error("POST /posts/:id/cancel failed", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to cancel post",
      },
      500,
    );
  }
});
