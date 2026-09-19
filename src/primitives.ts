import type { Decision, JevClient, Node } from "./types.js";
import { makeTrace } from "./types.js";

/** Choice primitive: pick one from a fixed set of options. */
export class ChoiceNode<T extends string> implements Node<T> {
  constructor(
    private options: T[],
    private question: string,
    private layer = "default"
  ) {}

  async run(state: string, jev: JevClient): Promise<Decision<T>> {
    const r = await jev.choice(state, this.options, this.question);
    return {
      value: r.value,
      confidence: r.confidence,
      trace: [
        makeTrace(
          "primitive",
          "Choice",
          r.value,
          r.confidence,
          this.layer,
          r.cost
        ),
      ],
      meta: { cost: r.cost, latency: r.latency, layer: this.layer },
    };
  }
}

/** Score primitive: rate on a fixed scale. */
export class ScoreNode implements Node<number> {
  constructor(
    private levels: string[],
    private question: string,
    private layer = "default"
  ) {}

  async run(state: string, jev: JevClient): Promise<Decision<number>> {
    const r = await jev.score(state, this.levels, this.question);
    return {
      value: r.value,
      confidence: r.confidence,
      trace: [
        makeTrace(
          "primitive",
          "Score",
          r.value,
          r.confidence,
          this.layer,
          r.cost
        ),
      ],
      meta: { cost: r.cost, latency: r.latency, layer: this.layer },
    };
  }
}

/** Noul primitive: yes/no with a probability. */
export class NoulNode implements Node<number> {
  constructor(
    private question: string,
    private layer = "default"
  ) {}

  async run(state: string, jev: JevClient): Promise<Decision<number>> {
    const r = await jev.noul(state, this.question);
    return {
      value: r.value,
      confidence: r.confidence,
      trace: [
        makeTrace(
          "primitive",
          "Noul",
          r.value,
          r.confidence,
          this.layer,
          r.cost
        ),
      ],
      meta: { cost: r.cost, latency: r.latency, layer: this.layer },
    };
  }
}