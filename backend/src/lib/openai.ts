import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing environment variable OPENAI_API_KEY");
  }

  client = new OpenAI({ apiKey });
  return client;
}

export function getEviModel(): string {
  return process.env.OPENAI_EVI_MODEL ?? "gpt-4o-mini";
}
