# jev-combinators

**面向 [Jev](https://typesafe.ai) 和其他判断原语的可组合决策电路。**

[English](./README.md) | [简体中文](./README.zh-CN.md)

---

大模型擅长生成。它不该做判断。

Jev 是一类新模型，它只做判断——不生成文本、不会幻觉，只输出结构化判断：

- **Choice** — 从固定选项里选一个
- **Score** — 在量尺上打分
- **Noul** — 是/否，带概率

但直接调用 Jev，判断逻辑仍然散落在 `if/else` 里。

这个库给你的是 **组合子（combinators）**——决策编程的逻辑门。

> 原语是晶体管。组合子是逻辑门。你设计的是芯片。

---

## 为什么

| 问题 | 决策组合子做了什么 |
|---|---|
| `if/else` 到处都是 | 判断变成可组合的节点 |
| 无法处理不确定性 | 置信度是一等公民 |
| 不知道判断是怎么做出的 | 每个节点都写入 `trace` |
| 廉价判断被昂贵模型挡住 | `Cascade` 按成本路由 |
| 重试逻辑手写 | `Retry` 和 `Fallback` 内置 |

---

## 安装

    npm install jev-combinators

需要一个兼容 Jev 的客户端。支持：

- 官方 TypeSafe API
- 本地复现：LitJev、OpenJev、System One Lite
- 任何实现了 `POST /v1/systemone` 协议的 HTTP 端点

---

## 快速开始

    import {
      Cascade, Gate, ChoiceNode, NoulNode, ScoreNode, Weighted, Then,
      createJevClient,
    } from "jev-combinators";

    const jev = createJevClient({
      apiKey: process.env.TYPESAFE_API_KEY,
    });

    const circuit = new Cascade([
      new Gate({
        predicate: new ChoiceNode(
          ["billing", "support", "spam"],
          "这封邮件是关于什么的？"
        ),
        threshold: 0.85,
        onHigh: new ChoiceNode(
          ["billing", "support", "spam"],
          "确认分类"
        ),
        onLow: new NoulNode("升级到云端？") as any,
      }),
      new Then([
        new ChoiceNode(
          ["billing", "support", "spam"],
          "精确分类"
        ),
        new Weighted([
          { node: new ScoreNode(["1","2","3","4","5"], "紧急程度"), weight: 0.6 },
          { node: new ScoreNode(["1","2","3","4","5"], "情绪强度"), weight: 0.4 },
        ]),
      ]),
    ]);

    const decision = await circuit.run(emailText, jev);

    console.log(decision.value);
    console.log(decision.confidence);
    console.log(decision.trace);
    console.log(decision.meta.cost);

运行完整 demo：

    pnpm install
    pnpm dev

---

## 组合子列表

### 核心五个

| 组合子 | 语义 | 适用场景 |
|---|---|---|
| `Then` | 串行推理链 | 多步工作流 |
| `Gate` | 置信度路由 | 自动执行 vs 升级 |
| `Vote` | 多问法投票 | 高风险判断 |
| `Cascade` | 便宜到昂贵，达标即停 | 成本优化 |
| `Weighted` | 多维评分合成 | 排序、优先级 |

### 扩展五个

| 组合子 | 语义 | 适用场景 |
|---|---|---|
| `Router` | 根据 Choice 值分支 | 不同类别走不同子电路 |
| `Loop` | 循环直到满足条件 | Agent 主循环、迭代精炼 |
| `Retry` | 换策略重试 | 低置信度时换一种问法 |
| `Fallback` | 降级到确定性规则 | 失败关闭、安全关键 |
| `Memory` | 门控是否记住 | 防止记忆爆炸 |

---

## 核心概念

| 概念 | 类比 | 代码里对应 |
|---|---|---|
| 原语 | 晶体管 | `ChoiceNode`, `ScoreNode`, `NoulNode` |
| 组合子 | 逻辑门 | `Then`, `Gate`, `Vote`, `Cascade`, `Weighted` |
| 决策图 | 芯片 | 嵌套的组合子 |
| 置信度 | 电流 | `decision.confidence` |
| trace | 示波器 | `decision.trace` |

---

## 统一接口

每个节点——无论是原语还是组合子——都实现同一个接口：

    interface Node<T> {
      run(state: string, jev: JevClient): Promise<Decision<T>>;
    }

    interface Decision<T> {
      value: T;
      confidence: number;
      trace: TraceEntry[];
      meta: { cost: number; latency: number; layer: string };
    }

因为所有东西共享这个接口，任何节点都可以嵌套在任何其他节点里。这就是决策图能成立的根本原因。

---

## 示例：多层分诊电路

见 examples/triage.ts，展示了：

- 本地层（廉价、低置信度）到云端层（昂贵、高置信度）
- 置信度门控
- 多维加权评分
- 完整 trace 输出

运行：

    pnpm dev

---

## 为什么叫决策编程

现代软件有两类工作：

1. **生成** — 写文本、写代码、画图。大模型擅长。
2. **判断** — 分类、路由、打分、门控。大模型在这里很浪费。

决策组合子把判断当成一等编程构造，就像 map/filter/reduce 把数据变换当成一等构造。

结果：更便宜、更快、更可观测、更可靠的决策。

---

## 状态

早期项目。API 可能变化。欢迎贡献。

## License

MIT
