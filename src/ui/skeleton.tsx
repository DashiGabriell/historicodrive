import type { CSSProperties } from "react";
import { cx } from "./cx";

type SkeletonProps = {
  height?: number | string;
  width?: number | string;
  circle?: boolean;
  className?: string;
};

export function Skeleton({
  height = 12,
  width = "100%",
  circle = false,
  className,
}: SkeletonProps) {
  const style: CSSProperties = {
    height: typeof height === "number" ? `${height}px` : height,
    width: typeof width === "number" ? `${width}px` : width,
    borderRadius: circle ? "50%" : undefined,
  };

  return <div aria-hidden="true" className={cx("skeleton", className)} style={style} />;
}
