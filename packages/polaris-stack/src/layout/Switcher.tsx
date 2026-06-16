import type { ElementType } from "react";
import { cx } from "../utilities/cx";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type SwitcherProps = BaseLayoutProps & {
  gap?: Space;
  threshold?: string;
  limit?: number;
  style?: StyleWithVars;
};

export function Switcher({
  as: Comp = "div",
  gap = "4",
  threshold = "30rem",
  limit,
  className,
  style,
  children,
  ...rest
}: SwitcherProps) {
  const inlineStyle: StyleWithVars = {
    ...style,
    "--ps-gap": spaceVar(gap),
    "--ps-threshold": threshold,
  };
  return (
    <Comp
      className={cx("ps-switcher", className)}
      style={inlineStyle}
      data-limit={limit}
      {...rest}
    >
      {children}
    </Comp>
  );
}
