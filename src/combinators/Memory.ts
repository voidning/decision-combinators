// src/combinators/memory.ts

import type { Decision, JevClient, Node, TraceEntry } from "../types.js";
import { makeTrace } from "../types.js";
import { NoulNode } from "../primitives.js";
import { ChoiceNode } from "../primitives.js";

export interface MemoryConfig {
  /** Noul: "should we remember this?" */
  shouldRemember: NoulNode;
  /** Choice: "what type of memory is this?" */
  memoryType: ChoiceNode<string>;
  /** In-memory store. Replace with your own persistence. */
  store?: MemoryStore;
  /** Confidence threshold for the remember decision. Default: 0.6. */
  threshold?: number;
}

export interface MemoryStore {
  entries: Array<{
    type: string;
    content: string;
    timestamp: number;
    confidence: number;
  }>;
}

/**
 * Memory: decide whether to store information, and what kind.
 *
 * This combinator prevents memory explosion: not everything deserves
 * to be remembered. Jev judges what's worth keeping.
 */
export class Memory implements Node<unknown> {
  private store: MemoryStore;
  private threshold: number;

  constructor(private config: MemoryConfig) {
    this.threshold = config.threshold ?? 0.6;
    this.store = config.store ?? { entries: [] };
  }

  async run(state: string, jev: JevClient): Promise<Decision<unknown>> {
    const remember = await this.config.shouldRemember.run(state, jev);

    const shouldStore =
      remember.value > 0.5 && remember.confidence >= this.threshold;

    const traces: TraceEntry[] = [
      ...remember.trace,
      makeTrace(
        "combinator",
        "Memory",
        shouldStore ? "remember" : "discard",
        remember.confidence,
        "Memory",
        0
      ),
    ];

    if (!shouldStore) {
      return {
        value: state,
        confidence: remember.confidence,
        trace: traces,
        meta: { cost: remember.meta.cost, latency: remember.meta.latency, layer: "Memory(discard)" },
      };
    }

    const typeResult = await this.config.memoryType.run(state, jev);
    traces.push(...typeResult.trace);

    this.store.entries.push({
      type: String(typeResult.value),
      content: state,
      timestamp: Date.now(),
      confidence: typeResult.confidence,
    });

    traces.push(
      makeTrace(
        "combinator",
        "Memory",
        `stored as "${typeResult.value}"`,
        typeResult.confidence,
        "Memory(store)",
        0
      )
    );

    return {
      value: state,
      confidence: typeResult.confidence,
      trace: traces,
      meta: {
        cost: remember.meta.cost + typeResult.meta.cost,
        latency: remember.meta.latency + typeResult.meta.latency,
        layer: "Memory(store)",
      },
    };
  }

  /** Get all stored memories. */
  getStore(): MemoryStore {
    return this.store;
  }

  /** Clear all memories. */
  clear(): void {
    this.store.entries = [];
  }
}
