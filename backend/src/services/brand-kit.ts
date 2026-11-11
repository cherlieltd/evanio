import { z } from "zod";
import { getOpenAI, getEviModel } from "../lib/openai.js";
import { uploadBrandAsset } from "../lib/storage.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

export const brandColorsSchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().min(1),
  accent: z.string().min(1),
  neutral: z.string().min(1),
  background: z.string().min(1),
});

export const brandFontsSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
});

export const logoOptionSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  style: z.string(),
});

export const brandKitSchema = z.object({
  id: z.string().uuid(),
  business_id: z.string().uuid(),
  logo_url: z.string().nullable(),
  logo_options: z.array(logoOptionSchema).default([]),
  colors: brandColorsSchema,
  fonts: brandFontsSchema,
  tagline: z.string().nullable(),
  style_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type BrandColors = z.infer<typeof brandColorsSchema>;
export type BrandFonts = z.infer<typeof brandFontsSchema>;
export type LogoOption = z.infer<typeof logoOptionSchema>;
export type BrandKit = z.infer<typeof brandKitSchema>;

const businessSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  description: z.string().nullable(),
  target_audience: z.string().nullable(),
  tone: z.string().nullable(),
});

export type BusinessRecord = z.infer<typeof businessSchema>;

const suggestionSchema = z.object({
  colors: brandColorsSchema,
  fonts: brandFontsSchema,
  tagline: z.string().min(1).max(120),
  style_notes: z.string().min(1).max(1200),
  logo_styles: z.array(z.string().min(1)).min(3).max(3),
});

function getImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3";
}

function parseBrandKitRow(row: Record<string, unknown>): BrandKit {
  const colors = brandColorsSchema.parse(row.colors ?? {});
  const fonts = brandFontsSchema.parse(row.fonts ?? {});
  const logoOptions = z
    .array(logoOptionSchema)
    .catch([])
    .parse(row.logo_options ?? []);

  return brandKitSchema.parse({
    ...row,
    colors,
    fonts,
    logo_options: logoOptions,
    tagline: row.tagline ?? null,
  });
}

export async function getBusinessForUser(
  userId: string,
): Promise<BusinessRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, user_id, name, website, industry, description, target_audience, tone",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load business: ${error.message}`);
  }

  return data ? businessSchema.parse(data) : null;
}

export async function getBrandKitForBusiness(
  businessId: string,
): Promise<BrandKit | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("brand_kits")
    .select(
      "id, business_id, logo_url, logo_options, colors, fonts, tagline, style_notes, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load brand kit: ${error.message}`);
  }

  if (!data) return null;

  try {
    return parseBrandKitRow(data as Record<string, unknown>);
  } catch {
    // Older/partial rows may not satisfy the strict schema yet.
    return null;
  }
}

export async function getBrandKitForUser(userId: string): Promise<{
  business: BusinessRecord | null;
  brandKit: BrandKit | null;
}> {
  const business = await getBusinessForUser(userId);
  if (!business) {
    return { business: null, brandKit: null };
  }

  const brandKit = await getBrandKitForBusiness(business.id);
  return { business, brandKit };
}

/** Shared context string for image/video/copy generation prompts. */
export function formatBrandKitForGeneration(input: {
  business: BusinessRecord | null;
  brandKit: BrandKit | null;
}): string {
  const { business, brandKit } = input;

  if (!business) {
    return "No business profile available.";
  }

  const lines = [
    `Business: ${business.name}`,
    business.industry ? `Industry: ${business.industry}` : null,
    business.description ? `Offer: ${business.description}` : null,
    business.target_audience ? `Audience: ${business.target_audience}` : null,
    business.tone ? `Tone: ${business.tone}` : null,
  ];

  if (brandKit) {
    lines.push(
      brandKit.tagline ? `Tagline: ${brandKit.tagline}` : null,
      `Colors: primary ${brandKit.colors.primary}, secondary ${brandKit.colors.secondary}, accent ${brandKit.colors.accent}, neutral ${brandKit.colors.neutral}, background ${brandKit.colors.background}`,
      `Fonts: heading ${brandKit.fonts.heading}, body ${brandKit.fonts.body}`,
      brandKit.style_notes ? `Style notes: ${brandKit.style_notes}` : null,
      brandKit.logo_url ? `Logo URL: ${brandKit.logo_url}` : null,
    );
  } else {
    lines.push("Brand kit not set yet — keep visuals clean and professional.");
  }

  return lines.filter(Boolean).join("\n");
}

async function suggestBrandIdentity(business: BusinessRecord) {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: getEviModel(),
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a brand designer for US small businesses. Return strict JSON only.",
      },
      {
        role: "user",
        content: `Create a brand kit suggestion for this business.

Name: ${business.name}
Website: ${business.website ?? "n/a"}
Industry: ${business.industry ?? "n/a"}
What they sell: ${business.description ?? "n/a"}
Target audience: ${business.target_audience ?? "n/a"}
Tone: ${business.tone ?? "n/a"}

Return JSON with:
{
  "colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "neutral": "#hex", "background": "#hex" },
  "fonts": { "heading": "Font Name", "body": "Font Name" },
  "tagline": "short tagline",
  "style_notes": "2-4 sentences about visual style, photography, and do/don't guidance",
  "logo_styles": ["style 1", "style 2", "style 3"]
}

Use real Google Fonts-style names (e.g. "Inter", "Playfair Display", "DM Sans").
logo_styles should be three distinct logo directions (wordmark, emblem, monogram, etc.).`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Brand suggestion returned empty response");
  }

  return suggestionSchema.parse(JSON.parse(raw));
}

async function generateLogoImage(prompt: string): Promise<Buffer> {
  const openai = getOpenAI();
  const model = getImageModel();

  const result = await openai.images.generate({
    model,
    prompt,
    n: 1,
    size: "1024x1024",
    ...(model.startsWith("dall-e")
      ? { response_format: "b64_json" as const }
      : {}),
  });

  const first = result.data?.[0];
  if (!first) {
    throw new Error("Image API returned no logo data");
  }

  if (first.b64_json) {
    return Buffer.from(first.b64_json, "base64");
  }

  if (first.url) {
    const response = await fetch(first.url);
    if (!response.ok) {
      throw new Error("Failed to download generated logo");
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error("Image API returned neither b64 nor url");
}

async function upsertBrandKitRow(input: {
  businessId: string;
  logoUrl: string | null;
  logoOptions: LogoOption[];
  colors: BrandColors;
  fonts: BrandFonts;
  tagline: string | null;
  styleNotes: string | null;
}): Promise<BrandKit> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("brand_kits")
    .upsert(
      {
        business_id: input.businessId,
        logo_url: input.logoUrl,
        logo_options: input.logoOptions,
        colors: input.colors,
        fonts: input.fonts,
        tagline: input.tagline,
        style_notes: input.styleNotes,
        updated_at: now,
      },
      { onConflict: "business_id" },
    )
    .select(
      "id, business_id, logo_url, logo_options, colors, fonts, tagline, style_notes, created_at, updated_at",
    )
    .single();

  if (error) {
    throw new Error(`Failed to save brand kit: ${error.message}`);
  }

  return parseBrandKitRow(data as Record<string, unknown>);
}

export async function generateBrandKit(userId: string): Promise<BrandKit> {
  const business = await getBusinessForUser(userId);
  if (!business) {
    throw new Error("Complete onboarding before generating a brand kit");
  }

  const suggestion = await suggestBrandIdentity(business);
  const logoOptions: LogoOption[] = [];

  for (const [index, style] of suggestion.logo_styles.entries()) {
    const prompt = [
      `Create a clean, modern logo for a US small business named "${business.name}".`,
      business.industry ? `Industry: ${business.industry}.` : null,
      business.tone ? `Brand tone: ${business.tone}.` : null,
      `Logo direction: ${style}.`,
      `Use a simple mark suitable for ads and social avatars.`,
      `Preferred colors inspired by ${suggestion.colors.primary} and ${suggestion.colors.accent}.`,
      "Flat vector style, centered, transparent-feeling background, no mockups, no watermarks, high contrast.",
    ]
      .filter(Boolean)
      .join(" ");

    const bytes = await generateLogoImage(prompt);
    const url = await uploadBrandAsset({
      userId,
      businessId: business.id,
      filename: `logo-option-${index + 1}-${Date.now()}.png`,
      bytes,
      contentType: "image/png",
    });

    logoOptions.push({
      id: `logo_${index + 1}`,
      url,
      style,
    });
  }

  return upsertBrandKitRow({
    businessId: business.id,
    logoUrl: logoOptions[0]?.url ?? null,
    logoOptions,
    colors: suggestion.colors,
    fonts: suggestion.fonts,
    tagline: suggestion.tagline,
    styleNotes: suggestion.style_notes,
  });
}

export async function updateBrandKit(
  userId: string,
  patch: {
    colors?: BrandColors;
    fonts?: BrandFonts;
    tagline?: string | null;
    style_notes?: string | null;
    logo_url?: string | null;
  },
): Promise<BrandKit> {
  const { business, brandKit } = await getBrandKitForUser(userId);
  if (!business) {
    throw new Error("Business not found");
  }
  if (!brandKit) {
    throw new Error("Generate a brand kit first");
  }

  if (patch.logo_url) {
    const allowed = new Set([
      ...brandKit.logo_options.map((option) => option.url),
      brandKit.logo_url,
    ]);
    // Allow uploaded logos under this business path as well.
    const isOwnedUpload = patch.logo_url.includes(
      `/${userId}/${business.id}/`,
    );
    if (!allowed.has(patch.logo_url) && !isOwnedUpload) {
      throw new Error("Selected logo is not part of this brand kit");
    }
  }

  return upsertBrandKitRow({
    businessId: business.id,
    logoUrl: patch.logo_url === undefined ? brandKit.logo_url : patch.logo_url,
    logoOptions: brandKit.logo_options,
    colors: patch.colors ?? brandKit.colors,
    fonts: patch.fonts ?? brandKit.fonts,
    tagline: patch.tagline === undefined ? brandKit.tagline : patch.tagline,
    styleNotes:
      patch.style_notes === undefined ? brandKit.style_notes : patch.style_notes,
  });
}

export async function uploadBrandLogo(
  userId: string,
  file: {
    bytes: Buffer;
    contentType: string;
    filename: string;
  },
): Promise<BrandKit> {
  const { business, brandKit } = await getBrandKitForUser(userId);
  if (!business) {
    throw new Error("Business not found");
  }

  const ext =
    file.contentType === "image/jpeg"
      ? "jpg"
      : file.contentType === "image/webp"
        ? "webp"
        : file.contentType === "image/svg+xml"
          ? "svg"
          : "png";

  const url = await uploadBrandAsset({
    userId,
    businessId: business.id,
    filename: `logo-upload-${Date.now()}.${ext}`,
    bytes: file.bytes,
    contentType: file.contentType,
  });

  const existingOptions = brandKit?.logo_options ?? [];
  const uploadedOption: LogoOption = {
    id: `upload_${Date.now()}`,
    url,
    style: "Uploaded logo",
  };

  return upsertBrandKitRow({
    businessId: business.id,
    logoUrl: url,
    logoOptions: [...existingOptions, uploadedOption],
    colors:
      brandKit?.colors ??
      ({
        primary: "#0F766E",
        secondary: "#134E4A",
        accent: "#F59E0B",
        neutral: "#334155",
        background: "#F8FAFC",
      } satisfies BrandColors),
    fonts:
      brandKit?.fonts ??
      ({
        heading: "Inter",
        body: "Inter",
      } satisfies BrandFonts),
    tagline: brandKit?.tagline ?? null,
    styleNotes: brandKit?.style_notes ?? null,
  });
}
