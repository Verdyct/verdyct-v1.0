import { Mistral } from "@mistralai/mistralai";

const EMBEDDING_MODEL = "mistral-embed";
const BATCH_SIZE = 50; // Mistral API accepts up to ~128, 50 keeps token usage safe
export const MISTRAL_EMBED_DIM = 1024;

/**
 * Computes embeddings for an array of texts using Mistral Embed (1024 dimensions).
 * Batches transparently in groups of 50.
 * Throws if MISTRAL_API_KEY is missing or any batch call fails.
 */
export async function mistralEmbed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env["MISTRAL_API_KEY"];
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY env var is not set");
  }

  const client = new Mistral({ apiKey });
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      inputs: batch,
    });

    // Sort by .index defensively — the API normally returns in order, but spec says nothing
    const data = response.data ?? [];
    const sorted = [...data].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0),
    );
    for (const item of sorted) {
      if (!item.embedding) {
        throw new Error(`Mistral returned empty embedding at index ${item.index ?? "?"}`);
      }
      results.push(item.embedding);
    }
  }

  return results;
}
