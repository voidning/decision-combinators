import type { Decision, JevClient, Node, TraceEntry } from "../types.js";

/**
 * Then: serial composition.
 * Each step's value is injected into the next step's state.
 */
export class Then<T = unknown> implements Node<T> {
  constructor(private steps: Node[]) {
    if (steps.length === 0) throw new Error("Then requires at least one step");
  }

  async run(state: string, jev: JevClient): Promise<Decision<T>> {
    let current = state;
    let last: Decision | null = null;
    const traces: TraceEntry[] = [];
    let cost = 0;
    let latency = 0;

    for (const step of this.steps) {
      last = await step.run(current, jev);
      traces.push(...last.trace);
      cost += last.meta.cost;
      latency += last.meta.latency;
      current += `\n[previous: ${last.value} (confidence ${last.confidence.toFixed(2)})]`;
    }

    return {
      value: last!.value as T,
      confidence: last!.confidence,
      trace: traces,
      meta: { cost, latency, layer: "Then" },
    };
  }
}