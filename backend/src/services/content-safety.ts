import { getOpenAI } from "../lib/openai.js";

export class UnsafePromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafePromptError";
  }
}

const celebrityPatterns = [
  /\b(taylor swift|beyonc[eé]|kim kardashian|kanye|drake|rihanna|oprah|elon musk|donald trump|joe biden|tom cruise|zendaya|selena gomez|justin bieber|ariana grande|cristiano ronaldo|lionel messi|mrbeast|pewdiepie)\b/i,
  /\b(celebrities|famous actor|famous actress|movie star|pop star|influencer lookalike|celebrity (likeness|endorsement|cameo))\b/i,
  /\b(looks? like|in the style of|as played by)\b.{0,40}\b(actor|actress|singer|rapper|athlete|politician)\b/i,
];

const trademarkPatterns = [
  /\b(nike|adidas|gucci|louis vuitton|chanel|apple logo|mcdonald'?s|coca[- ]?cola|pepsi|starbucks|disney|marvel|hello kitty|pokemon|nba|nfl|premier league)\b/i,
  /\b(logo of|brand logo of|official merchandise of|competitor('?s)? logo)\b/i,
  /\b(using|with|featuring)\b.{0,40}\b(another|other|competitor).{0,20}\b(logo|trademark|wordmark)\b/i,
];

const adultPatterns = [
  /\b(nsfw|porn|pornograph(y|ic)|nude|nudity|naked|explicit sex|sexual act|erotic|hentai|onlyfans)\b/i,
  /\b(bare breasts?|genital|xxx|fetish)\b/i,
];

function findMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return match[0];
  }
  return null;
}

export async function assertSafeAdPrompt(text: string): Promise<void> {
  const value = text.trim();
  if (!value) {
    throw new UnsafePromptError("Prompt is required");
  }

  const celebrity = findMatch(value, celebrityPatterns);
  if (celebrity) {
    throw new UnsafePromptError(
      "Prompts cannot request celebrities or lookalikes. Describe an original character instead.",
    );
  }

  const trademark = findMatch(value, trademarkPatterns);
  if (trademark) {
    throw new UnsafePromptError(
      "Prompts cannot request other brands' trademarks or logos. Describe original branding only.",
    );
  }

  const adult = findMatch(value, adultPatterns);
  if (adult) {
    throw new UnsafePromptError(
      "Prompts cannot include adult or sexual content.",
    );
  }

  try {
    const openai = getOpenAI();
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: value,
    });

    const result = moderation.results[0];
    if (result?.flagged) {
      const categories = result.categories;
      if (categories.sexual || categories["sexual/minors"]) {
        throw new UnsafePromptError(
          "Prompts cannot include adult or sexual content.",
        );
      }
      if (categories.violence || categories["violence/graphic"]) {
        throw new UnsafePromptError(
          "Prompts cannot include graphic or violent content.",
        );
      }
      throw new UnsafePromptError(
        "This prompt was blocked by content safety checks. Please revise and try again.",
      );
    }
  } catch (error) {
    if (error instanceof UnsafePromptError) throw error;
    // If moderation API is unavailable, local checks already ran.
    console.warn("OpenAI moderation skipped", error);
  }
}
