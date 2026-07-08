/**
 * Local, dependency-free embedding generator (1536 dims) used for pgvector
 * semantic search on notes. It hashes tokens into buckets and L2-normalizes the
 * result — this yields meaningful cosine similarity for keyword/topic overlap
 * without requiring an external embeddings provider or API key.
 *
 * Swap `embed()` for a call to a real embeddings API (e.g. Voyage, OpenAI) if
 * you want higher-quality semantic search; the 1536-dim contract is unchanged.
 */
const DIMENSIONS = 1536;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// FNV-1a hash → stable bucket index.
function hash(token: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

export function embed(text: string): number[] {
  const vec = new Array<number>(DIMENSIONS).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vec;

  for (const token of tokens) {
    // Two hashed features per token (uni-gram + prefix) for a richer signal.
    const a = hash(token) % DIMENSIONS;
    const b = hash(token.slice(0, 4) + '#') % DIMENSIONS;
    vec[a] += 1;
    vec[b] += 0.5;
  }

  // L2 normalize so cosine distance is comparable across notes.
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}
