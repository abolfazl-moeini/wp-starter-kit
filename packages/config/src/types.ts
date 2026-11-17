export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | unknown[];

export interface ModuleConfigOptions<T> {
  module: string;
  container?: HTMLElement | null;
  defaults?: Partial<T>;
  legacyGlobals?: string[];
}

export type NonceChangeListener = (newNonce: string, module?: string) => void;

export interface NonceRecoveryOptions {
  module?: string;
  /**
   * Optional getter returning the nonce used by the current client when headers
   * have not yet been populated by a downstream nonce middleware.
   */
  getCurrentNonce?: () => string;
  /**
   * Optional active refresh provider invoked when all passive nonces match the failed nonce.
   */
  refreshNonce?: () => Promise<string | null | undefined>;
  onRefresh?: (freshNonce: string) => void;
}
