import type { JevClient, JevResponse } from "./types.js";

/**
 * Create a Jev client that talks to the official TypeSafe API
 * or any compatible endpoint (including local open-source reimplementations).
 */
export function createJevClient(options: {
  baseUrl?: string;
  apiKey?: string;
  /** Cost per input token in USD. Default: 0.042 / 1M tokens. */
  costPerToken?: number;
} = {}): JevClient {
  const baseUrl = options.baseUrl ?? "https://api.typesafe.ai";
  const apiKey = options.apiKey ?? process.env.TYPESAFE_API_KEY;
  const costPerToken = options.costPerToken ?? 0.042 / 1_000_000;

  async function call(
    state: string,
    questions: Record<string, unknown>
  ): Promise<Record<string, any>> {
    const res = await fetch(`${baseUrl}/v1/systemone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ state, questions }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jev API error ${res.status}: ${text}`);
    }

    return res.json() as Promise<Record<string, any>>;
  }

  return {
    async choice(state, options, question) {
      const start = Date.now();
      const data = await call(state, {
        q: {
          type: "choice",
          question,
          options: Object.fromEntries(options.map((o) => [o, null])),
        },
      });
      const answer = data.answers?.q ?? data.q ?? {};
      return {
        value: answer.choice ?? answer.value ?? options[options.length - 1],
        confidence: answer.confidence ?? 0.9,
        latency: Date.now() - start,
        cost: state.length * costPerToken,
      };
    },

    async score(state, levels, question) {
      const start = Date.now();
      const data = await call(state, {
        q: {
          type: "score",
          question,
          levels,
        },
      });
      const answer = data.answers?.q ?? data.q ?? {};
      return {
        value: answer.score ?? answer.value ?? 0,
        confidence: answer.confidence ?? 0.9,
        latency: Date.now() - start,
        cost: state.length * costPerToken,
      };
    },

    async noul(state, question) {
      const start = Date.now();
      const data = await call(state, {
        q: { type: "noul", question },
      });
      const answer = data.answers?.q ?? data.q ?? {};
      return {
        value: answer.probability ?? answer.value ?? 0,
        confidence: answer.confidence ?? 0.9,
        latency: Date.now() - start,
        cost: state.length * costPerToken,
      };
    },
  };
}