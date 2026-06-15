import { describe, test, expect, jest } from "@jest/globals";

describe("@wpsk/rule-engine", () => {
  test("RuleEngine class is exported and instantiable", async () => {
    const { RuleEngine } = await import("../../packages/rule-engine/index.js");
    const engine = new RuleEngine();
    expect(engine).toBeInstanceOf(RuleEngine);
  });

  test("register(rules) accepts a single rule or an array; execute(data, cb) calls the callback", async () => {
    const { RuleEngine } = await import("../../packages/rule-engine/index.js");
    const engine = new RuleEngine();

    const rule = {
      name: "r1",
      condition: (fact) => fact.x > 0,
      then: (api, fact) => {
        fact.y = fact.x * 2;
      },
    };

    engine.register(rule);

    const cb = jest.fn((session) => session);
    await new Promise((resolve) => {
      engine.execute({ x: 5, y: 0 }, (session) => {
        cb(session);
        resolve();
      });
    });

    expect(cb).toHaveBeenCalledTimes(1);
    const sessionArg = cb.mock.calls[0][0];
    expect(sessionArg.x).toBe(5);
    expect(sessionArg.y).toBe(10);
  });

  test("register accepts an array; rules run in order; mutated data is observable in callback", async () => {
    const { RuleEngine } = await import("../../packages/rule-engine/index.js");
    const engine = new RuleEngine();

    const rules = [
      {
        name: "init",
        condition: () => true,
        then: (api, fact) => {
          fact.history = ["init"];
        },
      },
      {
        name: "double",
        condition: (fact) => typeof fact.value === "number",
        then: (api, fact) => {
          fact.history.push("double");
          fact.value = fact.value * 2;
        },
      },
    ];

    engine.register(rules);

    const cb = jest.fn();
    await new Promise((resolve) => {
      engine.execute({ value: 3 }, (session) => {
        cb(session);
        resolve();
      });
    });

    const session = cb.mock.calls[0][0];
    expect(session.history).toEqual(["init", "double"]);
    expect(session.value).toBe(6);
  });

  test("exposes findRules / turn / prioritize (interface contract)", async () => {
    const { RuleEngine } = await import("../../packages/rule-engine/index.js");
    const engine = new RuleEngine();
    expect(typeof engine.findRules).toBe("function");
    expect(typeof engine.turn).toBe("function");
    expect(typeof engine.prioritize).toBe("function");
  });
});
