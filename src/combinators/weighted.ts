import type { Decision, JevClient, Node, TraceEntry } from "../types.js";
import { makeTrace } from "../types.js";

export interface WeightedComponent {
  node: Node<number>;
  weight: number;
}

/**
 * Weighted: combine multiple Score nodes into a single weighted score.
 */
export class Weighted implements Node<number> {
  constructor(private components: WeightedComponent[]) {
    if (components.length === 0)
      throw new Error("Weighted requires at least one component");
  }

  async run(state: string, jev: JevClient): Promise<Decision<number>> {
    const results = await Promise.all(
      this.components.map((c) => c.node.run(state, jev))
    );

    let total = 0;
    let totalWeight = 0;
    let cost = 0;
    let latency = 0;
    const traces: TraceEntry[] = [];

    this.components.forEach((c, i) => {
      const r = results[i];
      total += Number(r.value) * c.weight;
      totalWeight += c.weight;
      cost += r.meta.cost;
      latency += r.meta.latency;
      traces.push(...r.trace);
    });

    const score = totalWeight > 0 ? total / totalWeight : 0;
    const confidence =
      totalWeight > 0
        ? results.reduce(
            (s, r, i) => s + r.confidence * this.components[i].weight,
            0
          ) / totalWeight
        : 0;

    traces.push(
      makeTrace("combinator", "Weighted", score, confidence, "Weighted", 0)
    );

    return {
      value: score,
      confidence,
      trace: traces,
      meta: { cost, latency, layer: "Weighted" },
    };
  }
}