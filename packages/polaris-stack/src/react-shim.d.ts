declare module "react" {
  export type ElementType =
    | keyof JSX.IntrinsicElements
    | React.ComponentType<unknown>;
  export type ReactNode = unknown;
  export type CSSProperties = Record<string, string | number | undefined>;
  export type ButtonHTMLAttributes<T> = {
    className?: string;
    type?: string;
    disabled?: boolean;
    onClick?: () => void;
    children?: ReactNode;
    [key: string]: unknown;
  };
  export type HTMLAttributes<T> = {
    className?: string;
    children?: ReactNode;
    [key: string]: unknown;
  };
}

declare module "react/jsx-runtime" {
  export const jsx: (type: unknown, props: unknown, key?: string) => unknown;
  export const jsxs: (type: unknown, props: unknown, key?: string) => unknown;
  export const Fragment: unknown;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
}
