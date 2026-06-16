import type { ElementType, ReactNode } from "react";

export type Space = "0" | "1" | "2" | "3" | "4" | "6" | "8";

export type BaseLayoutProps = {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
};
