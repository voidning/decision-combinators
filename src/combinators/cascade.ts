import type { Decision, JevClient, Node, TraceEntry } from "../types.js";
import { makeTrace } from "../types.js";

/**
 * Cascade: try levels from cheap to expensive.
 * Stop as soon as confidence meets the threshold.
 */
export class Cascade<T = unknown> implements Node<T> {
  private threshold: number;

  constructor(levels: Node<T>[], threshold = 0.85) {
    if (levels.length === 0)
      throw new Error("Cascade requires at least one level");
    this.threshold = threshold;
    this.levels = levels;
  }

  private levels: Node<T>[];

  async run(state: string, jev: JevClient): Promise<Decision<T>> {
    const traces: TraceEntry[] = [];
    let last: Decision<T> | null = null;
    let cost = 0;
    let latency = 0;

    for (let i = 0; i < this.levels.length; i++) {
      last = await this.levels[i].run(state, jev);
      traces.push(...last.trace);
      cost += last.meta.cost;
      latency += last.meta.latency;

      if (last.confidence >= this.threshold) {
        return {
          value: last.value,
          confidence: last.confidence,
          trace: traces,
          meta: { cost, latency, layer: `Cascade(L${i})` },
        };
      }
    }

    traces.push(
      makeTrace(
        "combinator",
        "Cascade",
        "escalated",
        last!.confidence,
        "escalated",
        0
      )
    );

    return {
      value: last!.value,
      confidence: last!.confidence,
      trace: traces,
      meta: { cost, latency, layer: "Cascade(all)" },
    };
  }
}