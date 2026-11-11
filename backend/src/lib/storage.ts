import { getSupabaseAdmin } from "./supabase.js";

const BRAND_ASSETS_BUCKET = "brand-assets";
const GENERATIONS_BUCKET = "generations";

export async function uploadBrandAsset(input: {
  userId: string;
  businessId: string;
  filename: string;
  bytes: Buffer;
  contentType: string;
}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const path = `${input.userId}/${input.businessId}/${input.filename}`;

  const { error } = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .upload(path, input.bytes, {
      contentType: input.contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload brand asset: ${error.message}`);
  }

  const { data } = supabase.storage.from(BRAND_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadGenerationAsset(input: {
  userId: string;
  generationId: string;
  filename: string;
  bytes: Buffer;
  contentType: string;
}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const path = `${input.userId}/${input.generationId}/${input.filename}`;

  const { error } = await supabase.storage
    .from(GENERATIONS_BUCKET)
    .upload(path, input.bytes, {
      contentType: input.contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload generation asset: ${error.message}`);
  }

  const { data } = supabase.storage.from(GENERATIONS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
