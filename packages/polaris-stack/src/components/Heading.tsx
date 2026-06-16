import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../utilities/cx";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  level?: HeadingLevel;
  children?: ReactNode;
};

const TAGS: Record<HeadingLevel, "h1" | "h2" | "h3" | "h4" | "h5" | "h6"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
};

export function Heading({
  level = 2,
  className,
  children,
  ...rest
}: HeadingProps) {
  const Tag = TAGS[level];
  return (
    <Tag
      className={cx("ps-heading", `ps-heading-${level}`, className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
