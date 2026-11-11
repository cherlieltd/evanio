import { z } from "zod";
import { decryptSecret, encryptSecret } from "../lib/crypto.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

const socialAccountSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  business_id: z.string().uuid().nullable(),
  platform: z.string(),
  account_name: z.string().nullable(),
  external_account_id: z.string().nullable(),
  access_token_encrypted: z.string().nullable().optional(),
  token_expires_at: z.string().nullable().optional(),
  auto_reply_enabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type SocialAccount = z.infer<typeof socialAccountSchema>;

const selectFields =
  "id, user_id, business_id, platform, account_name, external_account_id, access_token_encrypted, token_expires_at, auto_reply_enabled, metadata, created_at, updated_at";

export type PublicSocialAccount = Omit<
  SocialAccount,
  "access_token_encrypted"
> & { connected: boolean };

export function toPublicSocialAccount(account: SocialAccount): PublicSocialAccount {
  const { access_token_encrypted: _token, ...rest } = account;
  return {
    ...rest,
    connected: Boolean(_token),
  };
}

export async function listSocialAccountsForUser(
  userId: string,
): Promise<PublicSocialAccount[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_accounts")
    .select(selectFields)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list social accounts: ${error.message}`);
  }

  return z
    .array(socialAccountSchema)
    .parse(data ?? [])
    .map(toPublicSocialAccount);
}

export async function getSocialAccountById(
  id: string,
): Promise<SocialAccount | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_accounts")
    .select(selectFields)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load social account: ${error.message}`);
  }

  return data ? socialAccountSchema.parse(data) : null;
}

export async function getSocialAccountByExternalId(
  platform: string,
  externalAccountId: string,
): Promise<SocialAccount | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_accounts")
    .select(selectFields)
    .eq("platform", platform)
    .eq("external_account_id", externalAccountId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find social account: ${error.message}`);
  }

  return data ? socialAccountSchema.parse(data) : null;
}

export function getDecryptedPageToken(account: SocialAccount): string {
  if (!account.access_token_encrypted) {
    throw new Error("Social account has no access token");
  }
  return decryptSecret(account.access_token_encrypted);
}

export async function upsertSocialAccount(input: {
  userId: string;
  businessId: string | null;
  platform: "facebook" | "instagram";
  accountName: string;
  externalAccountId: string;
  accessToken: string;
  tokenExpiresAt?: string | null;
  metadata?: Record<string, unknown>;
  autoReplyEnabled?: boolean;
}): Promise<SocialAccount> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("social_accounts")
    .upsert(
      {
        user_id: input.userId,
        business_id: input.businessId,
        platform: input.platform,
        account_name: input.accountName,
        external_account_id: input.externalAccountId,
        access_token_encrypted: encryptSecret(input.accessToken),
        token_expires_at: input.tokenExpiresAt ?? null,
        auto_reply_enabled: input.autoReplyEnabled ?? true,
        metadata: input.metadata ?? {},
        updated_at: now,
      },
      { onConflict: "user_id,platform,external_account_id" },
    )
    .select(selectFields)
    .single();

  if (error) {
    throw new Error(`Failed to upsert social account: ${error.message}`);
  }

  return socialAccountSchema.parse(data);
}

export async function updateSocialAccountSettings(
  userId: string,
  accountId: string,
  patch: { auto_reply_enabled?: boolean },
): Promise<PublicSocialAccount> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_accounts")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("user_id", userId)
    .select(selectFields)
    .single();

  if (error) {
    throw new Error(`Failed to update social account: ${error.message}`);
  }

  return toPublicSocialAccount(socialAccountSchema.parse(data));
}

export async function deleteSocialAccount(
  userId: string,
  accountId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("social_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to disconnect social account: ${error.message}`);
  }
}
