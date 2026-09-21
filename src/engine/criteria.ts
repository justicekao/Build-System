// Evaluates goal/fail Criteria against simulation state. Streak criteria are
// stateless by design: instead of tracking a running counter, we just look
// back over the last N recorded snapshots in the run's history and check
// they all satisfy the condition. That keeps the evaluator a pure function
// of (current graph, environment, history) and easy to unit test.

import { evaluateExpression } from "./expression";
import { hasNoCrossingEdges, isAcyclic, isConnected, maxDegree } from "./graphAnalysis";
import type { Comparator, Criterion, QuantityMap, SystemGraph } from "./types";

export interface CriteriaContext {
  graph: SystemGraph;
  environment: QuantityMap;
  /** past graph snapshots, oldest first, with the current graph last */
  history: SystemGraph[];
}

export interface CriterionResult {
  criterion: Criterion;
  satisfied: boolean;
}

function compare(value: number, comparator: Comparator, target: number): boolean {
  switch (comparator) {
    case "gte":
      return value >= target;
    case "lte":
      return value <= target;
    case "eq":
      return value === target;
    case "gt":
      return value > target;
    case "lt":
      return value < target;
  }
}

function nodeQuantity(graph: SystemGraph, nodeId: string, quantity: string): number {
  return graph.nodes.find((n) => n.id === nodeId)?.quantities[quantity] ?? 0;
}

function buildFormulaScope(ctx: CriteriaContext): Record<string, number> {
  const scope: Record<string, number> = { tick: ctx.history.length - 1 };
  for (const [q, v] of Object.entries(ctx.environment)) {
    scope[`environment.${q}`] = v;
  }
  for (const node of ctx.graph.nodes) {
    for (const [q, v] of Object.entries(node.quantities)) {
      scope[`${node.id}.${q}`] = v;
    }
  }
  return scope;
}

export function evaluateCriterion(criterion: Criterion, ctx: CriteriaContext): boolean {
  switch (criterion.kind) {
    case "threshold": {
      const nodes =
        criterion.node === "*"
          ? ctx.graph.nodes.filter((n) => !n.locked)
          : ctx.graph.nodes.filter((n) => n.id === criterion.node);
      if (nodes.length === 0) return false;
      return nodes.every((n) =>
        compare(n.quantities[criterion.quantity] ?? 0, criterion.comparator, criterion.value),
      );
    }
    case "streak": {
      const window = criterion.delta ? criterion.turns + 1 : criterion.turns;
      if (ctx.history.length < window) return false;
      const recent = ctx.history.slice(-window);
      if (criterion.delta) {
        for (let i = 1; i < recent.length; i++) {
          const prev = nodeQuantity(recent[i - 1], criterion.node, criterion.quantity);
          const curr = nodeQuantity(recent[i], criterion.node, criterion.quantity);
          if (!compare(curr - prev, criterion.comparator, criterion.value)) return false;
        }
        return true;
      }
      return recent.every((snapshot) =>
        compare(
          nodeQuantity(snapshot, criterion.node, criterion.quantity),
          criterion.comparator,
          criterion.value,
        ),
      );
    }
    case "graph": {
      switch (criterion.check) {
        case "acyclic":
          return isAcyclic(ctx.graph);
        case "connected":
          return isConnected(ctx.graph);
        case "noCrossingEdges":
          return hasNoCrossingEdges(ctx.graph);
        case "maxDegree":
          return maxDegree(ctx.graph) <= (criterion.value ?? Infinity);
      }
      break;
    }
    case "formula": {
      const scope = buildFormulaScope(ctx);
      return evaluateExpression(criterion.expression, scope) > 0;
    }
  }
}

export function evaluateAll(criteria: Criterion[], ctx: CriteriaContext): CriterionResult[] {
  return criteria.map((criterion) => ({
    criterion,
    satisfied: evaluateCriterion(criterion, ctx),
  }));
}

export function allSatisfied(criteria: Criterion[], ctx: CriteriaContext): boolean {
  return criteria.every((c) => evaluateCriterion(c, ctx));
}

export function anySatisfied(criteria: Criterion[], ctx: CriteriaContext): boolean {
  return criteria.some((c) => evaluateCriterion(c, ctx));
}
