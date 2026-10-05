import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

export function Card({ padded = true, className, ...rest }: CardProps) {
  return <div className={cx("card", padded && "card-pad", className)} {...rest} />;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="card-title">{children}</h3>;
}

export function CardDesc({ children }: { children: ReactNode }) {
  return <p className="card-desc">{children}</p>;
}
