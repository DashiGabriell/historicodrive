import { Link } from "react-router-dom";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export type ButtonVariant =
  "primary" | "secondary" | "outline" | "ghost" | "destructive" | "coin" | "glow";

export type ButtonSize = "sm" | "md" | "lg";

export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return cx("btn", `btn-${variant}`, size !== "md" && `btn-${size}`, extra);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, size, className)}
      {...rest}
    />
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: unknown;
};

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  state,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      to={href}
      state={state}
      className={buttonClassName(variant, size, className)}
      {...rest}
    />
  );
}
