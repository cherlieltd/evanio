import {
  formatBrandKitForGeneration,
  getBrandKitForUser,
  type BrandKit,
  type BusinessRecord,
} from "./brand-kit.js";

export type GenerationBrandContext = {
  business: BusinessRecord | null;
  brandKit: BrandKit | null;
  promptBlock: string;
};

/**
 * All image and video generation flows must call this so outputs stay on-brand.
 */
export async function loadGenerationBrandContext(
  userId: string,
): Promise<GenerationBrandContext> {
  const { business, brandKit } = await getBrandKitForUser(userId);

  return {
    business,
    brandKit,
    promptBlock: formatBrandKitForGeneration({ business, brandKit }),
  };
}
