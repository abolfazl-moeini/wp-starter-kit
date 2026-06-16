import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "../utilities/cx";

type TextProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children?: ReactNode;
};

export function Text({
  as: Comp = "p",
  className,
  children,
  ...rest
}: TextProps) {
  return (
    <Comp className={cx("ps-text", className)} {...rest}>
      {children}
    </Comp>
  );
}
