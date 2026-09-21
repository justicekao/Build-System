import { describe, expect, it } from "vitest";
import { evaluateExpression } from "../expression";

describe("evaluateExpression", () => {
  it("evaluates arithmetic with correct precedence", () => {
    expect(evaluateExpression("2 + 3 * 4", {})).toBe(14);
    expect(evaluateExpression("(2 + 3) * 4", {})).toBe(20);
    expect(evaluateExpression("2 ^ 3 ^ 2", {})).toBe(512); // right-assoc
  });

  it("resolves variables from scope, including dotted names", () => {
    expect(evaluateExpression("glucose * 2", { glucose: 5 })).toBe(10);
    expect(evaluateExpression("cellA.glucose - cellB.glucose", { "cellA.glucose": 10, "cellB.glucose": 4 })).toBe(6);
  });

  it("supports unary minus and functions", () => {
    expect(evaluateExpression("-5 + abs(-3)", {})).toBe(-2);
    expect(evaluateExpression("clamp(15, 0, 10)", {})).toBe(10);
    expect(evaluateExpression("min(3, 1, 2)", {})).toBe(1);
    expect(evaluateExpression("max(3, 1, 2)", {})).toBe(3);
  });

  it("throws on unknown variables", () => {
    expect(() => evaluateExpression("unknown + 1", {})).toThrow(/Unknown variable/);
  });

  it("throws on unknown functions", () => {
    expect(() => evaluateExpression("bogus(1)", {})).toThrow(/Unknown function/);
  });

  it("throws on malformed expressions", () => {
    expect(() => evaluateExpression("2 +", {})).toThrow();
    expect(() => evaluateExpression("(2 + 3", {})).toThrow();
  });
});
