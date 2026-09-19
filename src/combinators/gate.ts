import type { Decision, JevClient, Node, TraceEntry } from "../types.js";
import { makeTrace } from "../types.js";

export interface GateConfig<T> {
  predicate: Node<T>;
  onHigh: Node<T>;
  onLow: Node<T>;
  /** Confidence threshold. Default: 0.85 */
  threshold?: number;
}

/**
 * Gate: confidence routing.
 * If predicate confidence >= threshold, run onHigh; else run onLow.
 */
export class Gate<T> implements Node<T> {
  private threshold: number;

  constructor(private config: GateConfig<T>) {
    this.threshold = config.threshold ?? 0.85;
  }

  async run(state: string, jev: JevClient): Promise<Decision<T>> {
    const r = await this.config.predicate.run(state, jev);
    const branch = r.confidence >= this.threshold ? "high" : "low";

    const gateTrace = makeTrace(
      "combinator",
      "Gate",
      branch,
      r.confidence,
      r.meta.layer,
      r.meta.cost
    );

    const out =
      branch === "high"
        ? await this.config.onHigh.run(state, jev)
        : await this.config.onLow.run(state, jev);

    return {
      value: out.value,
      confidence: out.confidence,
      trace: [gateTrace, ...out.trace],
      meta: {
        cost: r.meta.cost + out.meta.cost,
        latency: r.meta.latency + out.meta.latency,
        layer: `Gate(${branch})`,
      },
    };
  }
}