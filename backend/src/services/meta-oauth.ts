import {
  getMetaAppId,
  getMetaAppSecret,
  getMetaOAuthScopes,
  getMetaRedirectUri,
  META_GRAPH_BASE,
  metaGet,
  signMetaOAuthState,
  verifyMetaOAuthState,
} from "../lib/meta.js";
import { getBusinessForUser } from "./business.js";
import { upsertSocialAccount } from "./social-accounts.js";

type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type PageAccount = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
};

export function buildMetaConnectUrl(userId: string): string {
  const state = signMetaOAuthState(userId);
  const url = new URL(`https://www.facebook.com/${process.env.META_GRAPH_VERSION ?? "v22.0"}/dialog/oauth`);
  url.searchParams.set("client_id", getMetaAppId());
  url.searchParams.set("redirect_uri", getMetaRedirectUri());
  url.searchParams.set("state", state);
  url.searchParams.set("scope", getMetaOAuthScopes());
  url.searchParams.set("response_type", "code");
  return url.toString();
}

async function exchangeCodeForUserToken(code: string): Promise<TokenResponse> {
  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", getMetaAppId());
  url.searchParams.set("client_secret", getMetaAppSecret());
  url.searchParams.set("redirect_uri", getMetaRedirectUri());
  url.searchParams.set("code", code);

  const response = await fetch(url);
  const json = (await response.json()) as TokenResponse & {
    error?: { message?: string };
  };
  if (!response.ok || json.error || !json.access_token) {
    throw new Error(json.error?.message ?? "Failed to exchange Meta OAuth code");
  }
  return json;
}

async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<TokenResponse> {
  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", getMetaAppId());
  url.searchParams.set("client_secret", getMetaAppSecret());
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url);
  const json = (await response.json()) as TokenResponse & {
    error?: { message?: string };
  };
  if (!response.ok || json.error || !json.access_token) {
    throw new Error(
      json.error?.message ?? "Failed to exchange long-lived Meta token",
    );
  }
  return json;
}

export async function completeMetaOAuth(input: {
  code: string;
  state: string;
}): Promise<{ connected: number }> {
  const { userId } = verifyMetaOAuthState(input.state);
  const business = await getBusinessForUser(userId);

  const shortLived = await exchangeCodeForUserToken(input.code);
  const longLived = await exchangeForLongLivedToken(shortLived.access_token);

  const pages = await metaGet<{ data: PageAccount[] }>(
    "/me/accounts",
    longLived.access_token,
    {
      fields: "id,name,access_token,instagram_business_account",
    },
  );

  let connected = 0;
  const expiresAt = longLived.expires_in
    ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
    : null;

  for (const page of pages.data ?? []) {
    if (!page.access_token) continue;

    await upsertSocialAccount({
      userId,
      businessId: business?.id ?? null,
      platform: "facebook",
      accountName: page.name,
      externalAccountId: page.id,
      accessToken: page.access_token,
      tokenExpiresAt: expiresAt,
      metadata: {
        page_id: page.id,
        source: "meta_oauth",
      },
    });
    connected += 1;

    if (page.instagram_business_account?.id) {
      const igId = page.instagram_business_account.id;
      let igName = `Instagram · ${page.name}`;
      try {
        const ig = await metaGet<{ username?: string; name?: string }>(
          `/${igId}`,
          page.access_token,
          { fields: "username,name" },
        );
        igName = ig.username ? `@${ig.username}` : ig.name ?? igName;
      } catch {
        // Keep fallback name
      }

      await upsertSocialAccount({
        userId,
        businessId: business?.id ?? null,
        platform: "instagram",
        accountName: igName,
        externalAccountId: igId,
        accessToken: page.access_token,
        tokenExpiresAt: expiresAt,
        metadata: {
          page_id: page.id,
          instagram_business_account_id: igId,
          source: "meta_oauth",
        },
      });
      connected += 1;
    }
  }

  return { connected };
}
