// src/combinators/loop.ts

import type { Decision, JevClient, Node, TraceEntry } from "../types.js";
import { makeTrace } from "../types.js";
import { NoulNode } from "../primitives.js";

export interface LoopConfig {
  /** The body to run each iteration. */
  body: Node<unknown>;
  /** Noul node: "should we stop?" Returns 1 = stop, 0 = continue. */
  until: NoulNode;
  /** Max iterations to prevent infinite loops. Default: 10. */
  maxIterations?: number;
  /** Confidence threshold for the until check. Default: 0.7. */
  untilThreshold?: number;
}

/**
 * Loop: run body repeatedly until the until condition is satisfied.
 *
 * Each iteration's output is appended to the state, so the body
 * can see what previous iterations produced.
 */
export class Loop implements Node<unknown> {
  private maxIterations: number;
  private untilThreshold: number;

  constructor(private config: LoopConfig) {
    this.maxIterations = config.maxIterations ?? 10;
    this.untilThreshold = config.untilThreshold ?? 0.7;
    if (this.maxIterations <= 0) {
      throw new Error("Loop: maxIterations must be positive");
    }
  }

  async run(state: string, jev: JevClient): Promise<Decision<unknown>> {
    let current = state;
    let last: Decision<unknown> | null = null;
    const traces: TraceEntry[] = [];
    let cost = 0;
    let latency = 0;

    for (let i = 0; i < this.maxIterations; i++) {
      last = await this.config.body.run(current, jev);
      traces.push(...last.trace);
      cost += last.meta.cost;
      latency += last.meta.latency;

      current += `\n[iteration ${i + 1} result: ${last.value} (confidence ${last.confidence.toFixed(2)})]`;

      const stop = await this.config.until.run(current, jev);
      traces.push(...stop.trace);
      cost += stop.meta.cost;
      latency += stop.meta.latency;

      const shouldStop =
        stop.value > 0.5 && stop.confidence >= this.untilThreshold;

      traces.push(
        makeTrace(
          "combinator",
          "Loop",
          shouldStop ? "stop" : "continue",
          stop.confidence,
          `Loop(iter ${i + 1})`,
          0
        )
      );

      if (shouldStop) {
        return {
          value: last.value,
          confidence: last.confidence,
          trace: traces,
          meta: { cost, latency, layer: `Loop(done at iter ${i + 1})` },
        };
      }
    }

    // Max iterations reached
    traces.push(
      makeTrace(
        "combinator",
        "Loop",
        "max_iterations",
        last!.confidence,
        "Loop(exhausted)",
        0
      )
    );

    return {
      value: last!.value,
      confidence: last!.confidence,
      trace: traces,
      meta: { cost, latency, layer: "Loop(max)" },
    };
  }
}
