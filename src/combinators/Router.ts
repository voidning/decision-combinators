// src/combinators/router.ts

import type { Decision, JevClient, Node, TraceEntry } from "../types.js";
import { makeTrace } from "../types.js";
import { ChoiceNode } from "../primitives.js";

export interface RouterConfig {
  /** The Choice node whose value selects the route. */
  selector: ChoiceNode<string>;
  /** Map from selector value to the node to run. */
  routes: Record<string, Node<unknown>>;
  /** Optional default route if selector returns an unmapped value. */
  fallback?: Node<unknown>;
}

/**
 * Router: use a Choice node's output to decide which sub-circuit to run.
 *
 * Unlike Gate (which branches on confidence), Router branches on the
 * *value* of a Choice. This is the "switch statement" of decision circuits.
 */
export class Router implements Node<unknown> {
  constructor(private config: RouterConfig) {
    if (Object.keys(config.routes).length === 0) {
      throw new Error("Router requires at least one route");
    }
  }

  async run(state: string, jev: JevClient): Promise<Decision<unknown>> {
    const selection = await this.config.selector.run(state, jev);

    const routeName = String(selection.value);
    const target = this.config.routes[routeName] ?? this.config.fallback;

    const routerTrace = makeTrace(
      "combinator",
      "Router",
      routeName,
      selection.confidence,
      "Router",
      selection.meta.cost
    );

    if (!target) {
      throw new Error(
        `Router: no route for "${routeName}" and no fallback provided`
      );
    }

    const out = await target.run(
      `${state}\n[router: selected "${routeName}"]`,
      jev
    );

    return {
      value: out.value,
      confidence: out.confidence,
      trace: [routerTrace, ...selection.trace, ...out.trace],
      meta: {
        cost: selection.meta.cost + out.meta.cost,
        latency: selection.meta.latency + out.meta.latency,
        layer: `Router(${routeName})`,
      },
    };
  }
}
