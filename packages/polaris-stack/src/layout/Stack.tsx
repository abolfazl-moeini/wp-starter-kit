import type { ElementType } from "react";
import { cx } from "../utilities/cx";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type StackProps = BaseLayoutProps & {
  gap?: Space;
  style?: StyleWithVars;
};

export function Stack({
  as: Comp = "div",
  gap = "4",
  className,
  style,
  children,
  ...rest
}: StackProps) {
  const inlineStyle: StyleWithVars = { ...style, "--ps-gap": spaceVar(gap) };
  return (
    <Comp className={cx("ps-stack", className)} style={inlineStyle} {...rest}>
      {children}
    </Comp>
  );
}
