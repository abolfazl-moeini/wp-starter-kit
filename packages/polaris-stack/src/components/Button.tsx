import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../utilities/cx";

export type ButtonVariant = "solid" | "soft" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children?: ReactNode;
};

export function Button({
  variant = "solid",
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("ps-button", `ps-button-${variant}`, className)}
      {...rest}
    >
      {children}
    </button>
  );
}
