/**
 * @wpdev/rule-engine — minimal rule executor for @wpdev forms.
 *
 * Ports the API surface of `mrlogistic/assets/packages/rule-engine/lib/index.ts`
 * to plain ESM JavaScript (no TypeScript, no lodash). The original is a
 * 150-line port of `node-rules` — a chained when/then rule engine.
 *
 * The contract consumed by WDForm (and any caller) is:
 *
 *   const engine = new RuleEngine();
 *   engine.register(rule | rule[]);
 *   engine.execute(fact, (mutatedFact) => { ... });
 *
 * A rule has the shape:
 *   {
 *     name?: string,
 *     priority?: number,
 *     on?: boolean,                 // false disables the rule
 *     condition: (fact, api) => any, // truthy → run `then`
 *     then: (api, fact) => void,    // mutates `fact` in place
 *   }
 *
 * The engine copies `fact` via structuredClone before evaluation so callers
 * can pass in the original data and inspect the result in the callback
 * without cross-rule mutation leakage.
 */

function deepClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function isEqualish(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export class RuleEngine {
  constructor(rules, options = {}) {
    this.rules = [];
    this.activeRules = [];
    this.ignoreFactChanges = !!options.ignoreFactChanges;
    if (rules) this.register(rules);
  }

  init() {
    this.rules = [];
    this.activeRules = [];
  }

  /**
   * Add one rule or an array of rules. Default `on: true` if not set.
   * @param {object|object[]} rules
   */
  register(rules) {
    if (Array.isArray(rules)) {
      for (const r of rules) this._addRule(r);
    } else if (rules && typeof rules === "object") {
      this._addRule(rules);
    }
    this.sync();
  }

  _addRule(rule) {
    if (typeof rule.on === "undefined") rule.on = true;
    this.rules.push(rule);
  }

  /** Recompute `activeRules` from `rules`, sorted by `priority` desc. */
  sync() {
    this.activeRules = this.rules.filter((r) => r.on === true);
    this.activeRules.sort((a, b) => {
      const ap = a.priority || 0;
      const bp = b.priority || 0;
      return bp - ap;
    });
  }

  /**
   * Run all active rules against a copy of `fact` and pass the result to `cb`.
   * Synchronous; `cb` is called via `setImmediate`/`setTimeout` to avoid
   * blowing the call stack on long rule chains.
   *
   * @param {object} fact
   * @param {(mutatedFact: object) => void} cb
   */
  execute(fact, cb) {
    const session = deepClone(fact);
    const rules = this.activeRules;
    const matchPath = [];
    const ignore = this.ignoreFactChanges;
    const next = (fn) =>
      typeof setImmediate !== "undefined"
        ? setImmediate(fn)
        : setTimeout(fn, 0);
    let lastSession = deepClone(session);
    let complete = false;
    let pending = 0;

    const runRule = (idx) => {
      if (idx >= rules.length) {
        if (pending === 0 && !complete) {
          complete = true;
          session.matchPath = matchPath;
          next(() => cb(session));
        }
        return;
      }
      const rule = rules[idx];
      const api = {
        rule: () => rule,
        when: (outcome) => {
          pending++;
          if (outcome) {
            const ref = rule.name || `index_${idx}`;
            rule.then.ruleRef = ref;
            matchPath.push(ref);
            rule.then.call(session, api, session);
            // After firing a rule's `then`, advance to the next rule
            // in declaration order. Re-running from rule 0 only happens
            // when the rule's `then` body explicitly calls `api.restart()`
            // or `api.next()`. This avoids an infinite loop when two
            // rules each mutate the session and would otherwise each
            // see a "changed fact" and re-trigger the engine.
            next(() => {
              pending--;
              runRule(idx + 1);
            });
          } else {
            next(() => {
              pending--;
              runRule(idx + 1);
            });
          }
        },
        restart: () => runRule(0),
        stop: () => {
          complete = true;
          runRule(0);
        },
        next: () => {
          if (!ignore && !isEqualish(lastSession, session)) {
            lastSession = deepClone(session);
            next(() => runRule(0));
          } else {
            next(() => runRule(idx + 1));
          }
        },
      };

      try {
        // Convention: condition signature is (fact) => outcome OR
        // (api, fact) => outcome. Try the simpler form first.
        // Contract: a return value of `undefined` is treated as truthy
        // (matches the mrlogistic/node-rules convention where `() => true`
        // is the typical unconditional rule body).
        let outcome;
        try {
          outcome = rule.condition.call(session, session);
        } catch (_) {
          outcome = rule.condition.call(session, api, session);
        }
        if (typeof outcome === "undefined") {
          // Bare `() => true` — treat as truthy.
          api.when(true);
        } else {
          api.when(outcome);
        }
      } catch (err) {
        next(() => runRule(idx + 1));
      }
    };

    runRule(0);
  }

  findRules(query) {
    if (typeof query === "undefined") return this.rules;
    Object.keys(query).forEach(
      (k) => query[k] === undefined && delete query[k],
    );
    return this.rules.filter((rule) =>
      Object.keys(query).some((k) => query[k] === rule[k]),
    );
  }

  turn(state, filter) {
    const on = String(state).toLowerCase() === "on";
    const rules = this.findRules(filter);
    for (const r of rules) r.on = on;
    this.sync();
  }

  prioritize(priority, filter) {
    const rules = this.findRules(filter);
    for (const r of rules) r.priority = priority;
    this.sync();
  }
}

export default RuleEngine;
