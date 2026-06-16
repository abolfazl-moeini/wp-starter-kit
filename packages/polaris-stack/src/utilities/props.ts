import type { CSSProperties } from "react";

export type StyleWithVars = CSSProperties & {
  [key: `--ps-${string}`]: string | number | undefined;
};

export function spaceVar(key: string): string {
  return `var(--ps-space-${key})`;
}
