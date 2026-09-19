/**
 * Core types for decision combinators.
 */

/** The result of any decision node. */
export interface Decision<T = unknown> {
  /** The decision value. */
  value: T;
  /** Confidence in [0, 1]. */
  confidence: number;
  /** Execution trace, one entry per node visited. */
  trace: TraceEntry[];
  /** Cost and latency metadata. */
  meta: DecisionMeta;
}

/** Metadata attached to every decision. */
export interface DecisionMeta {
  /** Estimated cost in USD. */
  cost: number;
  /** Estimated latency in milliseconds. */
  latency: number;
  /** Which layer produced this decision. */
  layer: string;
}

/** A single entry in the execution trace. */
export interface TraceEntry {
  /** "primitive" | "combinator" | custom. */
  stage: string;
  /** Node name, e.g. "Choice", "Gate", "Then". */
  node: string;
  /** The value produced at this step. */
  value: unknown;
  /** Confidence at this step. */
  confidence: number;
  /** Which layer produced this step. */
  layer: string;
  /** Cost incurred at this step. */
  cost: number;
  /** Unix timestamp. */
  timestamp: number;
}

/** Response from a Jev client call. */
export interface JevResponse<T = unknown> {
  value: T;
  confidence: number;
  latency: number;
  cost: number;
}

/** Minimal Jev client interface. */
export interface JevClient {
  choice<T extends string>(
    state: string,
    options: T[],
    question: string
  ): Promise<JevResponse<T>>;

  score(
    state: string,
    levels: string[],
    question: string
  ): Promise<JevResponse<number>>;

  noul(
    state: string,
    question: string
  ): Promise<JevResponse<number>>;
}

/** A composable decision node. */
export interface Node<T = unknown> {
  run(state: string, jev: JevClient): Promise<Decision<T>>;
}

/** Helper to build trace entries. */
export function makeTrace(
  stage: string,
  node: string,
  value: unknown,
  confidence: number,
  layer: string,
  cost: number
): TraceEntry {
  return {
    stage,
    node,
    value,
    confidence,
    layer,
    cost,
    timestamp: Date.now(),
  };
}

/** Empty metadata. */
export function emptyMeta(layer = "unknown"): DecisionMeta {
  return { cost: 0, latency: 0, layer };
}