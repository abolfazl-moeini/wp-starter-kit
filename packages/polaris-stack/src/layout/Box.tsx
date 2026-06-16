import type { ElementType } from "react";
import { cx } from "../utilities/cx";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type BoxProps = BaseLayoutProps & {
  p?: Space;
  px?: Space;
  py?: Space;
  pt?: Space;
  pr?: Space;
  pb?: Space;
  pl?: Space;
  style?: StyleWithVars;
};

function paddingStyle(props: BoxProps): StyleWithVars {
  const style: StyleWithVars = { ...(props.style ?? {}) };
  if (props.p) style.padding = spaceVar(props.p);
  if (props.px) {
    style.paddingInline = spaceVar(props.px);
  }
  if (props.py) {
    style.paddingBlock = spaceVar(props.py);
  }
  if (props.pt) style.paddingBlockStart = spaceVar(props.pt);
  if (props.pr) style.paddingInlineEnd = spaceVar(props.pr);
  if (props.pb) style.paddingBlockEnd = spaceVar(props.pb);
  if (props.pl) style.paddingInlineStart = spaceVar(props.pl);
  return style;
}

export function Box({
  as: Comp = "div",
  className,
  p,
  px,
  py,
  pt,
  pr,
  pb,
  pl,
  style,
  children,
  ...rest
}: BoxProps) {
  return (
    <Comp
      className={cx("ps-box", className)}
      style={paddingStyle({ p, px, py, pt, pr, pb, pl, style })}
      {...rest}
    >
      {children}
    </Comp>
  );
}
