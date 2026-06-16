import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../utilities/cx";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div className={cx("ps-card", className)} {...rest}>
      {children}
    </div>
  );
}
