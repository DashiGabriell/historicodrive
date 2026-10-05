import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export type BadgeVariant =
  "primary" | "secondary" | "success" | "warning" | "destructive" | "coin";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "secondary", className, ...rest }: BadgeProps) {
  return <span className={cx("badge", `badge-${variant}`, className)} {...rest} />;
}
