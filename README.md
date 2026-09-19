# jev-combinators

**Composable decision circuits for [Jev](https://typesafe.ai) and other judgment primitives.**

[English](./README.md) | [简体中文](./README.zh-CN.md)

---

LLMs generate. They shouldn't decide.

Jev is a new class of model that only decides — no text generation, no hallucinations, just structured judgments:

- **Choice** — pick one from a fixed set
- **Score** — rate on a scale
- **Noul** — yes/no with a probability

But calling Jev directly still leaves decision logic scattered across `if/else` blocks.

This library gives you **combinators** — the logic gates of decision programming.

> Primitives are transistors. Combinators are logic gates. You design the chip.

---

## Why

| Problem | What decision combinators do |
|---|---|
| `if/else` scattered everywhere | Decisions become composable nodes |
| Can't handle uncertainty | Confidence is a first-class citizen |
| No trace of how a decision was made | Every node writes to `trace` |
| Cheap judgments blocked by expensive models | `Cascade` routes by cost |
| Retry logic written by hand | `Retry` and `Fallback` built in |

---

## Install

    npm install jev-combinators

Requires a Jev-compatible client. Works with:

- **Official TypeSafe API**
- **Local reimplementations**: LitJev, OpenJev, System One Lite
- Any HTTP endpoint implementing the `POST /v1/systemone` protocol

---

## Quick start

    import {
      Cascade, Gate, ChoiceNode, NoulNode, ScoreNode, Weighted, Then,
      createJevClient,
    } from "jev-combinators";

    const jev = createJevClient({
      apiKey: process.env.TYPESAFE_API_KEY,
      // Or point at a local reimplementation:
      // baseUrl: "http://localhost:8000",
    });

    const circuit = new Cascade([
      new Gate({
        predicate: new ChoiceNode(
          ["billing", "support", "spam"],
          "What is this email about?"
        ),
        threshold: 0.85,
        onHigh: new ChoiceNode(
          ["billing", "support", "spam"],
          "Confirm classification"
        ),
        onLow: new NoulNode("Escalate to cloud?") as any,
      }),
      new Then([
        new ChoiceNode(
          ["billing", "support", "spam"],
          "Precise classification"
        ),
        new Weighted([
          { node: new ScoreNode(["1","2","3","4","5"], "Urgency"), weight: 0.6 },
          { node: new ScoreNode(["1","2","3","4","5"], "Sentiment"), weight: 0.4 },
        ]),
      ]),
    ]);

    const decision = await circuit.run(emailText, jev);

    console.log(decision.value);
    console.log(decision.confidence);
    console.log(decision.trace);
    console.log(decision.meta.cost);

Run the full demo:

    pnpm install
    pnpm dev

---

## The combinators

### Core five

| Combinator | Semantics | Use when |
|---|---|---|
| `Then` | Serial reasoning chain | Multi-step workflows |
| `Gate` | Confidence routing | Auto-execute vs escalate |
| `Vote` | Multi-prompt voting | High-risk judgments |
| `Cascade` | Cheap to expensive, stop when confident | Cost optimization |
| `Weighted` | Multi-signal scoring | Ranking, prioritization |

### Extended five

| Combinator | Semantics | Use when |
|---|---|---|
| `Router` | Branch on Choice value | Different sub-circuits per category |
| `Loop` | Repeat until satisfied | Agent main loop, iterative refinement |
| `Retry` | Try alternatives | Low-confidence, try a different approach |
| `Fallback` | Deterministic backup | Fail closed, safety-critical |
| `Memory` | Gate what to remember | Prevent memory explosion |

---

## Concepts

| Concept | Analogy | In the code |
|---|---|---|
| Primitives | Transistors | `ChoiceNode`, `ScoreNode`, `NoulNode` |
| Combinators | Logic gates | `Then`, `Gate`, `Vote`, `Cascade`, `Weighted` |
| Decision graph | Chip | Nested combinators |
| Confidence | Current | `decision.confidence` |
| Trace | Oscilloscope | `decision.trace` |

---

## The interface

Every node — primitive or combinator — implements:

    interface Node<T> {
      run(state: string, jev: JevClient): Promise<Decision<T>>;
    }

    interface Decision<T> {
      value: T;
      confidence: number;
      trace: TraceEntry[];
      meta: { cost: number; latency: number; layer: string };
    }

Because everything shares this interface, any node can nest inside any other node. That's what makes a decision graph possible.

---

## Example: multi-layer triage

See examples/triage.ts for a full demo showing:

- Local layer (cheap, low confidence) to cloud layer (expensive, high confidence)
- Confidence gating
- Weighted multi-signal scoring
- Full trace output

Run it with:

    pnpm dev

---

## Why "decision programming"

Modern software has two kinds of work:

1. **Generation** — writing text, code, images. LLMs excel here.
2. **Judgment** — classifying, routing, scoring, gating. LLMs are wasteful here.

Decision combinators treat judgment as a first-class programming construct, just like map/filter/reduce treats data transformation.

The result: cheaper, faster, more observable, more reliable decisions.

---

## Status

Early. The API may change. Contributions welcome.

## License

MIT
