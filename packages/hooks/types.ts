export type HookName = `${string}.${string}.${string}`;
export type HookNamespace = `@${string}/${string}`;

export interface HooksInstance {
  addAction(
    hookName: HookName | string,
    namespace: HookNamespace | string,
    callback: (...args: unknown[]) => void,
    priority?: number,
  ): void;
  addFilter(
    hookName: HookName | string,
    namespace: HookNamespace | string,
    callback: (...args: unknown[]) => unknown,
    priority?: number,
  ): unknown;
  doAction(hookName: HookName | string, ...args: unknown[]): void;
  applyFilters(hookName: HookName | string, value: unknown, ...args: unknown[]): unknown;
  removeAction(hookName: HookName | string, namespace: HookNamespace | string): void;
  removeFilter(hookName: HookName | string, namespace: HookNamespace | string): void;
}