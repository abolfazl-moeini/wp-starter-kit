import type { ElementType } from "react";
import { cx } from "../utilities/cx";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type CenterProps = BaseLayoutProps & {
  max?: string;
  gutters?: Space;
  style?: StyleWithVars;
};

export function Center({
  as: Comp = "div",
  max = "var(--ps-size-content)",
  gutters = "4",
  className,
  style,
  children,
  ...rest
}: CenterProps) {
  const inlineStyle: StyleWithVars = {
    ...style,
    "--ps-max": max,
    "--ps-gutters": spaceVar(gutters),
  };
  return (
    <Comp className={cx("ps-center", className)} style={inlineStyle} {...rest}>
      {children}
    </Comp>
  );
}
