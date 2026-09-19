import type { Decision, JevClient, Node, TraceEntry } from "../types.js";
import { makeTrace } from "../types.js";

export type VoteMode = "majority" | "mean";

/**
 * Vote: ask multiple variants of the same question, aggregate by majority or mean.
 * Confidence is discounted by agreement.
 */
export class Vote<T = unknown> implements Node<T> {
  constructor(
    private asks: Node<T>[],
    private mode: VoteMode = "majority"
  ) {
    if (asks.length === 0) throw new Error("Vote requires at least one ask");
  }

  async run(state: string, jev: JevClient): Promise<Decision<T>> {
    const results = await Promise.all(
      this.asks.map((a) => a.run(state, jev))
    );

    const values = results.map((r) => r.value);
    const avgConf =
      results.reduce((s, r) => s + r.confidence, 0) / results.length;
    const totalCost = results.reduce((s, r) => s + r.meta.cost, 0);
    const totalLatency = Math.max(...results.map((r) => r.meta.latency));

    const traces: TraceEntry[] = results.flatMap((r) => r.trace);

    if (this.mode === "mean") {
      const mean =
        values.reduce((s, v) => s + Number(v), 0) / values.length;
      traces.push(
        makeTrace("combinator", "Vote", mean, avgConf, "Vote", 0)
      );
      return {
        value: mean as T,
        confidence: avgConf,
        trace: traces,
        meta: { cost: totalCost, latency: totalLatency, layer: "Vote(mean)" },
      };
    }

    // Majority vote
    const counts = new Map<string, number>();
    values.forEach((v) => {
      const k = String(v);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });

    let topKey = "";
    let topCount = 0;
    for (const [k, c] of counts) {
      if (c > topCount) {
        topKey = k;
        topCount = c;
      }
    }

    const winner = values.find((v) => String(v) === topKey)!;
    const agreement = topCount / values.length;
    const finalConf = avgConf * agreement;

    traces.push(
      makeTrace("combinator", "Vote", winner, finalConf, "Vote", 0)
    );

    return {
      value: winner as T,
      confidence: finalConf,
      trace: traces,
      meta: {
        cost: totalCost,
        latency: totalLatency,
        layer: "Vote(majority)",
      },
    };
  }
}