import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v22.0";
export const META_GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function getMetaAppId(): string {
  const value = process.env.META_APP_ID;
  if (!value) throw new Error("Missing environment variable META_APP_ID");
  return value;
}

export function getMetaAppSecret(): string {
  const value = process.env.META_APP_SECRET;
  if (!value) throw new Error("Missing environment variable META_APP_SECRET");
  return value;
}

export function getMetaWebhookVerifyToken(): string {
  const value = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!value) {
    throw new Error("Missing environment variable META_WEBHOOK_VERIFY_TOKEN");
  }
  return value;
}

export function getMetaRedirectUri(): string {
  const value =
    process.env.META_REDIRECT_URI ??
    `${process.env.API_PUBLIC_URL ?? "http://localhost:8080"}/meta/oauth/callback`;
  return value;
}

export function getMetaOAuthScopes(): string {
  return (
    process.env.META_OAUTH_SCOPES ??
    [
      "pages_show_list",
      "pages_manage_metadata",
      "pages_read_engagement",
      "pages_manage_posts",
      "pages_messaging",
      "pages_manage_engagement",
      "instagram_basic",
      "instagram_manage_comments",
      "instagram_manage_messages",
      "instagram_content_publish",
      "business_management",
    ].join(",")
  );
}

export function signMetaOAuthState(userId: string): string {
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, exp }), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", getMetaAppSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyMetaOAuthState(state: string): { userId: string } {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) throw new Error("Invalid OAuth state");

  const expected = createHmac("sha256", getMetaAppSecret())
    .update(payload)
    .digest("base64url");

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid OAuth state signature");
  }

  const parsed = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as { userId?: string; exp?: number };

  if (!parsed.userId || !parsed.exp || parsed.exp < Date.now()) {
    throw new Error("OAuth state expired");
  }

  return { userId: parsed.userId };
}

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", getMetaAppSecret())
    .update(rawBody, "utf8")
    .digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function metaGet<T>(
  path: string,
  accessToken: string,
  query: Record<string, string> = {},
): Promise<T> {
  const url = new URL(
    path.startsWith("http") ? path : `${META_GRAPH_BASE}${path}`,
  );
  url.searchParams.set("access_token", accessToken);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  const json = (await response.json()) as T & {
    error?: { message?: string };
  };
  if (!response.ok || json.error) {
    throw new Error(json.error?.message ?? `Meta GET failed (${response.status})`);
  }
  return json;
}

export async function metaPost<T>(
  path: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = new URL(
    path.startsWith("http") ? path : `${META_GRAPH_BASE}${path}`,
  );
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as T & {
    error?: { message?: string };
  };
  if (!response.ok || json.error) {
    throw new Error(
      json.error?.message ?? `Meta POST failed (${response.status})`,
    );
  }
  return json;
}
