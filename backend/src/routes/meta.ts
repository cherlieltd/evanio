import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth.js";
import { buildMetaConnectUrl, completeMetaOAuth } from "../services/meta-oauth.js";
import type { AppVariables } from "../types/context.js";

export const metaRoutes = new Hono<{ Variables: AppVariables }>();

metaRoutes.get("/meta/connect", requireAuth, async (c) => {
  const user = c.get("user");
  try {
    const authorizeUrl = buildMetaConnectUrl(user.id);
    return c.json({ authorizeUrl });
  } catch (error) {
    console.error("GET /meta/connect failed", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Meta connect URL",
      },
      500,
    );
  }
});

metaRoutes.get("/meta/oauth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const oauthError = c.req.query("error");
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

  if (oauthError) {
    return c.redirect(
      `${webOrigin}/dashboard/social-inbox?meta=error&reason=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code || !state) {
    return c.redirect(
      `${webOrigin}/dashboard/social-inbox?meta=error&reason=missing_code`,
    );
  }

  try {
    const result = await completeMetaOAuth({ code, state });
    return c.redirect(
      `${webOrigin}/dashboard/social-inbox?meta=connected&count=${result.connected}`,
    );
  } catch (error) {
    console.error("Meta OAuth callback failed", error);
    const reason =
      error instanceof Error ? error.message : "oauth_failed";
    return c.redirect(
      `${webOrigin}/dashboard/social-inbox?meta=error&reason=${encodeURIComponent(reason)}`,
    );
  }
});
