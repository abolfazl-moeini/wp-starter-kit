import type { ElementType } from "react";
import { cx } from "../utilities/cx";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type SidebarProps = BaseLayoutProps & {
  gap?: Space;
  side?: "start" | "end";
  sideWidth?: string;
  contentMin?: string;
  style?: StyleWithVars;
};

export function Sidebar({
  as: Comp = "div",
  gap = "4",
  side = "start",
  sideWidth = "20rem",
  contentMin = "50%",
  className,
  style,
  children,
  ...rest
}: SidebarProps) {
  const inlineStyle: StyleWithVars = {
    ...style,
    "--ps-gap": spaceVar(gap),
    "--ps-side-width": sideWidth,
    "--ps-content-min": contentMin,
  };
  return (
    <Comp
      className={cx("ps-sidebar", className)}
      data-side={side}
      style={inlineStyle}
      {...rest}
    >
      {children}
    </Comp>
  );
}
