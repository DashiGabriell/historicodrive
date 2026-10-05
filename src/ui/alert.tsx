import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export type AlertVariant = "info" | "success" | "warning" | "destructive";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

export function Alert({ variant = "info", className, ...rest }: AlertProps) {
  return <div className={cx("alert", `alert-${variant}`, className)} {...rest} />;
}
