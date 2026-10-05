import type { ReactNode } from "react";
import { cx } from "./cx";

export type MetricTone = "success" | "warning" | "destructive";

type MetricProps = {
  label: ReactNode;
  value: ReactNode;
  tone?: MetricTone;
};

export function Metric({ label, value, tone }: MetricProps) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className={cx("value", tone && `text-${tone}`)}>{value}</div>
    </div>
  );
}
