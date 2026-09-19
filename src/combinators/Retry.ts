// src/combinators/retry.ts

import type { Decision, JevClient, Node, TraceEntry } from "../types.js";
import { makeTrace } from "../types.js";

export interface RetryConfig {
  /** The primary node to try. */
  primary: Node<unknown>;
  /** Alternative nodes to try if primary fails or is low-confidence. */
  alternatives: Node<unknown>[];
  /** Max attempts total (primary + alternatives). Default: 3. */
  maxAttempts?: number;
  /** If primary confidence >= this, don't retry. Default: 0.8. */
  confidenceThreshold?: number;
}

/**
 * Retry: try primary, then alternatives, until one succeeds or we run out.
 *
 * Unlike Cascade (which is cheap→expensive), Retry is about *strategy*:
 * if one approach doesn't work, try a different approach at the same tier.
 */
export class Retry implements Node<unknown> {
  private maxAttempts: number;
  private confidenceThreshold: number;

  constructor(private config: RetryConfig) {
    this.maxAttempts = config.maxAttempts ?? 3;
    this.confidenceThreshold = config.confidenceThreshold ?? 0.8;
  }

  async run(state: string, jev: JevClient): Promise<Decision<unknown>> {
    const candidates = [this.config.primary, ...this.config.alternatives];
    const traces: TraceEntry[] = [];
    let cost = 0;
    let latency = 0;
    let last: Decision<unknown> | null = null;

    for (let i = 0; i < Math.min(candidates.length, this.maxAttempts); i++) {
      last = await candidates[i].run(state, jev);
      traces.push(...last.trace);
      cost += last.meta.cost;
      latency += last.meta.latency;

      traces.push(
        makeTrace(
          "combinator",
          "Retry",
          `attempt ${i + 1}`,
          last.confidence,
          `Retry(attempt ${i + 1})`,
          0
        )
      );

      if (last.confidence >= this.confidenceThreshold) {
        return {
          value: last.value,
          confidence: last.confidence,
          trace: traces,
          meta: { cost, latency, layer: `Retry(success at ${i + 1})` },
        };
      }

      // Inject failure context for next attempt
      state += `\n[attempt ${i + 1} failed with confidence ${last.confidence.toFixed(2)}. Try a different approach.]`;
    }

    traces.push(
      makeTrace(
        "combinator",
        "Retry",
        "exhausted",
        last!.confidence,
        "Retry(exhausted)",
        0
      )
    );

    return {
      value: last!.value,
      confidence: last!.confidence,
      trace: traces,
      meta: { cost, latency, layer: "Retry(exhausted)" },
    };
  }
}
