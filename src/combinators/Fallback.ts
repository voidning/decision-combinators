// src/combinators/fallback.ts

import type { Decision, JevClient, Node, TraceEntry } from "../types.js";
import { makeTrace } from "../types.js";

export interface FallbackConfig {
  /** The primary Jev-based decision node. */
  primary: Node<unknown>;
  /** A synchronous, deterministic fallback function. */
  fallback: (state: string) => unknown;
  /** If primary confidence >= this, use primary. Default: 0.7. */
  confidenceThreshold?: number;
  /** Layer label for the fallback. Default: "fallback". */
  fallbackLayer?: string;
}

/**
 * Fallback: if primary confidence is too low, use a deterministic fallback.
 *
 * This is the "fail closed" mechanism. When Jev can't decide confidently,
 * don't guess — fall back to a rule that you know is safe.
 */
export class Fallback implements Node<unknown> {
  private confidenceThreshold: number;

  constructor(private config: FallbackConfig) {
    this.confidenceThreshold = config.confidenceThreshold ?? 0.7;
  }

  async run(state: string, jev: JevClient): Promise<Decision<unknown>> {
    const primary = await this.config.primary.run(state, jev);

    if (primary.confidence >= this.confidenceThreshold) {
      return primary;
    }

    const fallbackValue = this.config.fallback(state);
    const layer = this.config.fallbackLayer ?? "fallback";

    const fallbackTrace = makeTrace(
      "combinator",
      "Fallback",
      fallbackValue,
      1.0, // deterministic fallback has full confidence
      layer,
      0
    );

    return {
      value: fallbackValue,
      confidence: 1.0,
      trace: [
        ...primary.trace,
        fallbackTrace,
        makeTrace(
          "combinator",
          "Fallback",
          "activated",
          primary.confidence,
          layer,
          0
        ),
      ],
      meta: {
        cost: primary.meta.cost,
        latency: primary.meta.latency,
        layer: `Fallback(${layer})`,
      },
    };
  }
}
